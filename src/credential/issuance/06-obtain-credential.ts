import {
  type CryptoContext,
  sha256ToBase64,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import type { AuthorizeAccess } from "./05-authorize-access";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
  ValidationFailed,
} from "../../utils/errors";
import { CredentialResponse, NonceResponse } from "./types";
import { createDPopToken } from "../../utils/dpop";
import { v4 as uuidv4 } from "uuid";
import { LogLevel, Logger } from "../../utils/logging";
import type { SupportedCredentialFormat } from "../../trust/types";

export type ObtainCredential = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  clientId: Out<StartUserAuthorization>["clientId"],
  credentialDefinition: {
    credential_configuration_id: string;
    credential_identifier?: string;
  },
  context: {
    dPopCryptoContext: CryptoContext;
    credentialCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  },
  operationType?: "reissuing"
) => Promise<{
  credential: string;
  format: SupportedCredentialFormat;
}>;

export const createNonceProof = async (
  nonce: string,
  issuer: string,
  audience: string,
  ctx: CryptoContext
): Promise<string> => {
  const jwk = await ctx.getPublicKey();
  return new SignJWT(ctx)
    .setPayload({
      nonce,
    })
    .setProtectedHeader({
      typ: "openid4vci-proof+jwt",
      jwk,
    })
    .setAudience(audience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("5min")
    .sign();
};

/**
 * Obtains the credential from the issuer.
 * The key pair of the credentialCryptoContext is used for Openid4vci proof JWT to be presented with the Access Token and the DPoP Proof JWT at the Credential Endpoint
 * of the Credential Issuer to request the issuance of a credential linked to the public key contained in the JWT proof.
 * The Openid4vci proof JWT incapsulates the nonce extracted from the token response from the {@link authorizeAccess} step.
 * The credential request is sent to the Credential Endpoint of the Credential Issuer via HTTP POST with the type of the credential, its format, the access token and the JWT proof.
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param accessToken The access token response returned by {@link authorizeAccess}
 * @param clientId The client id returned by {@link startUserAuthorization}
 * @param credentialDefinition The credential definition of the credential to be obtained returned by {@link authorizeAccess}
 * @param context.credentialCryptoContext The crypto context used to obtain the credential
 * @param context.dPopCryptoContext The DPoP crypto context
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @param operationType Specify the type of credential issuance (used for reissuing)
 * @returns The credential response containing the credential
 */
export const obtainCredential: ObtainCredential = async (
  issuerConf,
  accessToken,
  clientId,
  credentialDefinition,
  context,
  operationType
) => {
  const {
    credentialCryptoContext,
    appFetch = fetch,
    dPopCryptoContext,
  } = context;
  const { credential_configuration_id, credential_identifier } =
    credentialDefinition;

  const credentialUrl = issuerConf.openid_credential_issuer.credential_endpoint;
  const issuerUrl = issuerConf.oauth_authorization_server.issuer;
  const nonceUrl = issuerConf.openid_credential_issuer.nonce_endpoint;

  // Fetch the nonce from the Credential Issuer
  const { c_nonce } = await appFetch(nonceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((body) => NonceResponse.parse(body));

  /**
   * JWT proof token to bind the request nonce to the key that will bind the holder User with the Credential
   * This is presented along with the access token to the Credential Endpoint as proof of possession of the private key used to sign the Access Token.
   * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-proof-types
   */
  const signedNonceProof = await createNonceProof(
    c_nonce,
    clientId,
    issuerUrl,
    credentialCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `Signed nonce proof: ${signedNonceProof}`);

  // Validation of accessTokenResponse.authorization_details if contain credentialDefinition
  const containsCredentialDefinition = accessToken.authorization_details.some(
    (c) =>
      c.credential_configuration_id === credential_configuration_id &&
      (credential_identifier
        ? c.credential_identifiers.includes(credential_identifier)
        : true)
  );

  if (!containsCredentialDefinition) {
    Logger.log(
      LogLevel.ERROR,
      `Credential definition not found in the access token response ${accessToken.authorization_details}`
    );
    throw new ValidationFailed({
      message:
        "The access token response does not contain the requested credential",
    });
  }

  /**
   * The credential request body.
   * We accept both `credential_identifier` (recommended) and `credential_configuration_id`
   * when the Authorization Server does not support `credential_identifier`.
   * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-15.html#section-3.3.4
   */
  const credentialRequestFormBody = credential_identifier
    ? {
        credential_identifier: credential_identifier,
        proof: { jwt: signedNonceProof, proof_type: "jwt" },
      }
    : {
        credential_configuration_id: credential_configuration_id,
        proof: { jwt: signedNonceProof, proof_type: "jwt" },
      };

  Logger.log(
    LogLevel.DEBUG,
    `Credential request body: ${JSON.stringify(credentialRequestFormBody)}`
  );

  const tokenRequestSignedDPop = await createDPopToken(
    {
      htm: "POST",
      htu: credentialUrl,
      jti: `${uuidv4()}`,
      ath: await sha256ToBase64(accessToken.access_token),
    },
    dPopCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `Token request DPoP: ${tokenRequestSignedDPop}`);

  const credentialRes = await appFetch(credentialUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      DPoP: tokenRequestSignedDPop,
      Authorization: `${accessToken.token_type} ${accessToken.access_token}`,
      ...(operationType === "reissuing" && { operationType }),
    },
    body: JSON.stringify(credentialRequestFormBody),
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((body) => CredentialResponse.safeParse(body))
    .catch(handleObtainCredentialError);

  if (!credentialRes.success) {
    Logger.log(
      LogLevel.ERROR,
      `Credential Response validation failed: ${credentialRes.error.message}`
    );
    throw new ValidationFailed({
      message: "Credential Response validation failed",
      reason: credentialRes.error.message,
    });
  }

  Logger.log(
    LogLevel.DEBUG,
    `Credential Response: ${JSON.stringify(credentialRes.data)}`
  );

  // Extract the format corresponding to the credential_configuration_id used
  const issuerCredentialConfig =
    issuerConf.openid_credential_issuer.credential_configurations_supported[
      credential_configuration_id
    ];

  // TODO: [SIW-2264] Handle multiple credentials
  return {
    credential: credentialRes.data.credentials.at(0)!.credential,
    format: issuerCredentialConfig!.format,
  };
};

/**
 * Handle the credential error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {IssuerResponseError} with a specific code for more context
 */
const handleObtainCredentialError = (e: unknown) => {
  Logger.log(LogLevel.ERROR, `Error occurred while obtaining credential: ${e}`);

  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
    .handle(201, {
      // Although it is technically not an error, we handle it as such to avoid
      // changing the return type of `obtainCredential` and introduce a breaking change.
      code: IssuerResponseErrorCodes.CredentialIssuingNotSynchronous,
      message:
        "This credential cannot be issued synchronously. It will be available at a later time.",
    })
    .handle(403, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "Invalid status found for the given credential",
    })
    .handle(404, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "Invalid status found for the given credential",
    })
    .handle("*", {
      code: IssuerResponseErrorCodes.CredentialRequestFailed,
      message: "Unable to obtain the requested credential",
    })
    .buildFrom(e);
};
