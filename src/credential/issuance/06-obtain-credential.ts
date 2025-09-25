import { type CryptoContext, SignJWT } from "@pagopa/io-react-native-jwt";
import type { AuthorizeAccess } from "./05-authorize-access";
import type { GetIssuerConfig } from "./02-get-issuer-config";
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

export type ObtainCredential = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  clientId: Out<StartUserAuthorization>["clientId"],
  credentialDefinition: {
    credential_configuration_id: string;
    credential_identifier?: string;
  },
  context: {
    credentialCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<
  { credentials: CredentialResponse["credentials"] } & { format: string }
>;

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
  const { credentialCryptoContext, appFetch = fetch } = context;

  const credentialUrl = issuerConf.credential_endpoint;
  const issuerUrl = issuerConf.issuer;
  const nonceUrl = issuerConf.nonce_endpoint;

  if (!nonceUrl) {
    throw new ValidationFailed({
      message:
        "Nonce Endpoint not found or access token does not contain the c_nonce",
    });
  }

  const proofs = await Promise.all(
    Array.from(Array(issuerConf.batch_size).keys()).map(async () => {
      // Fetch the nonce from the Credential Issuer
      const { c_nonce } = await appFetch(nonceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then(hasStatusOrThrow(200))
        .then((res) => res.json())
        .then((body) => NonceResponse.parse(body));
      if (!c_nonce) {
        throw new ValidationFailed({
          message:
            "Nonce Endpoint not found or access token does not contain the c_nonce",
        });
      }

      /**
       * JWT proof token to bind the request nonce to the key that will bind the holder User with the Credential
       * This is presented along with the access token to the Credential Endpoint as proof of possession of the private key used to sign the Access Token.
       * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-proof-types
       */
      return createNonceProof(
        c_nonce,
        clientId,
        issuerUrl,
        credentialCryptoContext
      );
    })
  );

  const credential =
    issuerConf.credential_configurations_supported[
      credentialDefinition.credential_configuration_id
    ];

  if (!credential) {
    throw new ValidationFailed({
      message: "The credential configuration is not supported by the issuer",
    });
  }

  const format = credential.format;

  if (!format) {
    throw new ValidationFailed({
      message:
        "The credential doesn't contain the format required by the issuer",
    });
  }

  /** The credential request body */
  const credentialRequestFormBody = {
    credential_configuration_id:
      credentialDefinition.credential_configuration_id,
    proofs: {
      jwt: proofs,
    },
  };

  const credentialRes = await appFetch(credentialUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

  // We support only one credential for now
  return {
    format,
    credentials: credentialRes.data.credentials,
  };
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
    .handle("*", {
      code: IssuerResponseErrorCodes.CredentialRequestFailed,
      message: "Unable to obtain the requested credential",
    })
    .buildFrom(e);
};
