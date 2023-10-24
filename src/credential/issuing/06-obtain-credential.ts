import * as z from "zod";
import uuid from "react-native-uuid";
import {
  type CryptoContext,
  verify as verifyJwt,
  decode as decodeJwt,
} from "@pagopa/io-react-native-jwt";
import { createDPopToken } from "../../utils/dpop";
import { createNonceProof } from "../../utils/par";
import type { StartFlow } from "./01-start-flow";
import { hasStatus, type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { AuthorizeAccess } from "./05-authorize-access";
import { SdJwt4VC } from "../../sd-jwt/types";

const CredentialEndpointResponse = z.object({
  credential: z.string(),
  format: z.literal("vc+sd-jwt"),
  /* YAGNI
  Ideally, we may request more than one credential after a single authorization phase
  Each new call to the credential endpoint must carry a different nonce value,
  otherwise it would be rejected.
  So every response has a new nonce value to eventually be used in the next request.
  It's not implementd so far
  c_nonce: z.string(),
  c_nonce_expires_in: z.number().positive(), 
  */
});

export type ObtainCredential = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  nonce: Out<AuthorizeAccess>["nonce"],
  clientId: Out<AuthorizeAccess>["clientId"],
  credentialType: Out<StartFlow>["credentialType"],
  context: {
    credentialCryptoContext: CryptoContext;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{ credential: string; format: string }>;

/**
 * Fetch a credential from the issuer
 *
 * @param issuerConf The Issuer configuration
 * @param accessToken The access token to grant access to the credential, obtained with the access authorization step
 * @param nonce The nonce value to prevent reply attacks, obtained with the access authorization step
 * @param clientId Identifies the current client across all the requests of the issuing flow
 * @param credentialType The type of the credential to be requested
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
  context
) => {
  const {
    credentialCryptoContext,
    walletProviderBaseUrl,
    appFetch = fetch,
  } = context;

  const credentialUrl = issuerConf.openid_credential_issuer.credential_endpoint;

  const signedDPopForPid = await createDPopToken(
    {
      htm: "POST",
      htu: credentialUrl,
      jti: `${uuid.v4()}`,
    },
    credentialCryptoContext
  );
  const signedNonceProof = await createNonceProof(
    nonce,
    clientId,
    walletProviderBaseUrl,
    credentialCryptoContext
  );

  const requestBody = {
    credential_definition: JSON.stringify({
      type: [credentialType],
    }),
    format: "vc+sd-jwt",
    proof: JSON.stringify({
      jwt: signedNonceProof,
      proof_type: "jwt",
    }),
  };

  const formBody = new URLSearchParams(requestBody);

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

  // validate the received credential signature
  // is correct and refers to the public keys of the issuer
  const decodedCredential = await verifyJwt(
    credential,
    issuerConf.openid_credential_issuer.jwks.keys
  ).catch((_) => {
    // FIXME: [SIW-629] signature verification failures is ignored
    // as issuer does not implement this feature correctly.
    // Just logging for now.
    console.error(_);
    return decodeJwt(credential);
  });

  // validate credential structure
  const { payload } = SdJwt4VC.parse({
    header: decodedCredential.protectedHeader,
    payload: decodedCredential.payload,
  });

  // validate holder binding
  const holderBindingKey = await credentialCryptoContext.getPublicKey();
  if (!payload.cnf.jwk.kid || payload.cnf.jwk.kid !== holderBindingKey.kid) {
    throw new Error(
      `Failed to verify holder binding, expected kid: ${holderBindingKey.kid}, got: ${payload.cnf.jwk.kid}`
    );
  }

  return { credential, format };
};
