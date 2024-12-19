import {
  type CryptoContext,
  sha256ToBase64,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import type { AuthorizeAccess } from "./05-authorize-access";
import type { GetIssuerConfig } from "./02-evaluate-issuer-trust";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
  ValidationFailed,
} from "../../utils/errors";
import { CredentialResponse } from "./types";
import { createDPopToken } from "../../utils/dpop";
import uuid from "react-native-uuid";

export type ObtainCredential = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  clientId: Out<StartUserAuthorization>["clientId"],
  credentialDefinition: Out<StartUserAuthorization>["credentialDefinition"],
  context: {
    dPopCryptoContext: CryptoContext;
    credentialCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<CredentialResponse>;

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
 * @param issuerConf The issuer configuration returned by {@link getIssuerConfig}
 * @param accessToken The access token response returned by {@link authorizeAccess}
 * @param clientId The client id returned by {@link startUserAuthorization}
 * @param credentialDefinition The credential definition of the credential to be obtained returned by {@link startUserAuthorization}
 * @param tokenRequestSignedDPop The DPoP signed token request returned by {@link authorizeAccess}
 * @param context.credentialCryptoContext The crypto context used to obtain the credential
 * @param context.dPopCryptoContext The DPoP crypto context
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The credential response containing the credential
 */
export const obtainCredential: ObtainCredential = async (
  issuerConf,
  accessToken,
  clientId,
  credentialDefinition,
  context
) => {
  const {
    credentialCryptoContext,
    appFetch = fetch,
    dPopCryptoContext,
  } = context;

  const credentialUrl = issuerConf.openid_credential_issuer.credential_endpoint;

  /**
   * JWT proof token to bind the request nonce to the key that will bind the holder User with the Credential
   * This is presented along with the access token to the Credential Endpoint as proof of possession of the private key used to sign the Access Token.
   * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-proof-types
   */
  const signedNonceProof = await createNonceProof(
    accessToken.c_nonce,
    clientId,
    credentialUrl,
    credentialCryptoContext
  );

  // Validation of accessTokenResponse.authorization_details if contain credentialDefinition
  const containsCredentialDefinition = accessToken.authorization_details.some(
    (c) =>
      c.credential_configuration_id ===
        credentialDefinition.credential_configuration_id &&
      c.format === credentialDefinition.format &&
      c.type === credentialDefinition.type
  );

  if (!containsCredentialDefinition) {
    throw new ValidationFailed({
      message:
        "The access token response does not contain the requested credential",
    });
  }

  /** The credential request body */
  const credentialRequestFormBody = {
    credential_definition: {
      type: [credentialDefinition.credential_configuration_id],
    },
    format: credentialDefinition.format,
    proof: {
      jwt: signedNonceProof,
      proof_type: "jwt",
    },
  };

  const tokenRequestSignedDPop = await createDPopToken(
    {
      htm: "POST",
      htu: credentialUrl,
      jti: `${uuid.v4()}`,
      ath: await sha256ToBase64(accessToken.access_token),
    },
    dPopCryptoContext
  );
  const credentialRes = await appFetch(credentialUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      DPoP: tokenRequestSignedDPop,
      Authorization: `${accessToken.token_type} ${accessToken.access_token}`,
    },
    body: JSON.stringify(credentialRequestFormBody),
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((body) => CredentialResponse.safeParse(body))
    .catch(handleObtainCredentialError);

  if (!credentialRes.success) {
    throw new ValidationFailed({
      message: "Credential Response validation failed",
      reason: credentialRes.error.message,
    });
  }

  return credentialRes.data;
};

/**
 * Handle the credential error by mapping it to a custom exception.
 * If the error is not an instance of {@link UnexpectedStatusCodeError}, it is thrown as is.
 * @param e - The error to be handled
 * @throws {IssuerResponseError} with a specific code for more context
 */
const handleObtainCredentialError = (e: unknown) => {
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
