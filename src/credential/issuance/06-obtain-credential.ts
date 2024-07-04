import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import type { AuthorizeAccess } from "./05-authorize-access";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { hasStatus, type Out } from "../../../src/utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import { ValidationFailed } from "../../../src/utils/errors";
import { CredentialResponse } from "./types";

export type ObtainCredential = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  clientId: Out<StartUserAuthorization>["clientId"],
  credentialDefinition: Out<StartUserAuthorization>["credentialDefinition"],
  tokenRequestSignedDPop: Out<AuthorizeAccess>["tokenRequestSignedDPop"],
  context: {
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

export const obtainCredential: ObtainCredential = async (
  issuerConf,
  accessToken,
  clientId,
  credentialDefinition,
  tokenRequestSignedDPop,
  context
) => {
  const { credentialCryptoContext, appFetch = fetch } = context;

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
  const constainsCredentialDefinition = accessToken.authorization_details.some(
    (c) =>
      c.credential_configuration_id ===
        credentialDefinition.credential_configuration_id &&
      c.format === credentialDefinition.format &&
      c.type === credentialDefinition.type
  );

  if (!constainsCredentialDefinition) {
    throw new ValidationFailed(
      "The access token response does not contain the requested credential"
    );
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

  const credentialRes = await appFetch(credentialUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      DPoP: tokenRequestSignedDPop,
      Authorization: `${accessToken.token_type} ${accessToken.access_token}`,
    },
    body: JSON.stringify(credentialRequestFormBody),
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((body) => CredentialResponse.safeParse(body));

  if (!credentialRes.success) {
    throw new ValidationFailed(credentialRes.error.message);
  }

  return credentialRes.data;
};
