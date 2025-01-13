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
import { CredentialResponse } from "./types";
import { OpenConnectCredentialSdJwt } from "../../entity/connect-discovery/types";

export type ObtainCredential = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  clientId: Out<StartUserAuthorization>["clientId"],
  credentialDefinition: Out<StartUserAuthorization>["credentialDefinition"],
  context: {
    credentialCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<CredentialResponse>;

export const createNonceProof = async (
  nonce: string | undefined,
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

  const vct = getVtcParam(issuerConf, credentialDefinition);

  const credentialRequestFormBody = {
    ...vct,
    credential_definition: {
      type: [credentialDefinition.credential_configuration_id],
    },
    format: credentialDefinition.format,
    proof: {
      jwt: signedNonceProof,
      proof_type: "jwt",
    },
  };

  /** The credential request body */

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
    .then((body) => CredentialResponse.safeParse(body));

  if (!credentialRes.success) {
    throw new ValidationFailed({
      message: "Credential Response validation failed",
      reason: credentialRes.error.message,
    });
  }

  return credentialRes.data;
};

const getVtcParam = (
  issuerConf: Out<GetIssuerConfig>["issuerConf"],
  credentialDefinition: Out<StartUserAuthorization>["credentialDefinition"]
) => {
  if (credentialDefinition.format === "vc+sd-jwt") {
    // If this throws then there's something wrong with the credential configuration
    const vct = OpenConnectCredentialSdJwt.parse(
      issuerConf.credential_configurations_supported[
        credentialDefinition.credential_configuration_id
      ]
    ).vct;

    return {
      vct,
    };
  } else {
    return {};
  }
};
