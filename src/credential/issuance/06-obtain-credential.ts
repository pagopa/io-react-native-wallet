import * as z from "zod";
import uuid from "react-native-uuid";
import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { createDPopToken } from "../../utils/dpop";

import type { StartFlow } from "./01-start-flow";
import { hasStatus, type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { AuthorizeAccess } from "./05-authorize-access";
import { SupportedCredentialFormat } from "./const";

/**
 * Return the signed jwt for nonce proof of possession
 */
export const createNonceProof = async (
  nonce: string,
  issuer: string,
  audience: string,
  ctx: CryptoContext
): Promise<string> => {
  return new SignJWT(ctx)
    .setPayload({
      nonce,
      jwk: await ctx.getPublicKey(),
    })
    .setProtectedHeader({
      type: "openid4vci-proof+jwt",
    })
    .setAudience(audience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
};

const CredentialEndpointResponse = z.object({
  credential: z.string(),
  format: SupportedCredentialFormat,
});

export type ObtainCredential = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  nonce: Out<AuthorizeAccess>["nonce"],
  clientId: Out<AuthorizeAccess>["clientId"],
  credentialType: Out<StartFlow>["credentialType"],
  credentialFormat: SupportedCredentialFormat,
  context: {
    credentialCryptoContext: CryptoContext;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{ credential: string; format: SupportedCredentialFormat }>;

// Checks whether in the Entity confoguration at least one credential
// is defined for the given type and format
const isCredentialAvailable = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  credentialType: Out<StartFlow>["credentialType"],
  credentialFormat: SupportedCredentialFormat
): boolean => {
  console.log(
    issuerConf.openid_credential_issuer.credentials_supported,
    credentialType,
    credentialFormat
  );
  return issuerConf.openid_credential_issuer.credentials_supported.some(
    (c) =>
      c.format === credentialFormat &&
      c.credential_definition.type.includes(credentialType)
  );
};

/**
 * Fetch a credential from the issuer
 *
 * @param issuerConf The Issuer configuration
 * @param accessToken The access token to grant access to the credential, obtained with the access authorization step
 * @param nonce The nonce value to prevent reply attacks, obtained with the access authorization step
 * @param clientId Identifies the current client across all the requests of the issuing flow
 * @param credentialType The type of the credential to be requested
 * @param credentialFormat The format of the requested credential. @see {SupportedCredentialFormat}
 * @param context.credentialCryptoContext The context to access the key the Credential will be bound to
 * @param context.walletProviderBaseUrl The base url of the Wallet Provider
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The signed credential token
 */
export const obtainCredential: ObtainCredential = async (
  issuerConf,
  accessToken,
  nonce,
  clientId,
  credentialType,
  credentialFormat,
  context
) => {
  const {
    credentialCryptoContext,
    walletProviderBaseUrl,
    appFetch = fetch,
  } = context;

  if (!isCredentialAvailable(issuerConf, credentialType, credentialFormat)) {
    throw new Error(
      `The Issuer provides no credential for type ${credentialType} and format ${credentialFormat}`
    );
  }

  const credentialUrl = issuerConf.openid_credential_issuer.credential_endpoint;

  /** DPoP token for demonstating the possession
      of the key that will bind the holder User with the Credential
      @see https://datatracker.ietf.org/doc/html/rfc9449 */
  const signedDPopForPid = await createDPopToken(
    {
      htm: "POST",
      htu: credentialUrl,
      jti: `${uuid.v4()}`,
    },
    credentialCryptoContext
  );

  /** JWT proof token to bind the request nonce
      to the key that will bind the holder User with the Credential
      @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-proof-types */
  const signedNonceProof = await createNonceProof(
    nonce,
    clientId,
    walletProviderBaseUrl,
    credentialCryptoContext
  );

  /** The credential request body */
  const formBody = new URLSearchParams({
    credential_definition: JSON.stringify({
      type: [credentialType],
    }),
    format: credentialFormat,
    proof: JSON.stringify({
      jwt: signedNonceProof,
      proof_type: "jwt",
    }),
  });

  const { credential, format } = await appFetch(credentialUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: signedDPopForPid,
      Authorization: accessToken,
    },
    body: formBody.toString(),
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then(CredentialEndpointResponse.parse);

  return { credential, format };
};
