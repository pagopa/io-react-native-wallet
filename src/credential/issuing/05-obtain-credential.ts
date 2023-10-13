import * as z from "zod";
import uuid from "react-native-uuid";
import type { CryptoContext } from "@pagopa/io-react-native-jwt/lib/typescript/utils/crypto";
import { createDPopToken } from "../../utils/dpop";
import { createNonceProof } from "../../utils/par";
import type { StartFlow } from "./01-start-flow";
import { hasStatus, type Out } from "./utils";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { AuthorizeAccess } from "./04-authorize-access";

const CredentialEndpointResponse = z.object({
  credential: z.string(),
  format: z.string(),
  /* YAGNI
  c_nonce: z.string(),
  c_nonce_expires_in: z.number().positive(), 
  */
});

type ObtainCredentialContext = {
  credentialCryptoContext: CryptoContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
};

export type ObtainCredential = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  accessToken: Out<AuthorizeAccess>["accessToken"],
  nonce: Out<AuthorizeAccess>["nonce"],
  clientId: Out<AuthorizeAccess>["clientId"],
  credentialType: Out<StartFlow>["credentialType"]
) => Promise<{ credential: string }>;

export const obtainCredential =
  (ctx: ObtainCredentialContext): ObtainCredential =>
  /**
   *
   * @param issuerConf
   * @param accessToken
   * @param nonce
   * @param clientId
   * @param credentialType
   * @returns The signed credential
   */
  async (
    issuerConf,
    accessToken,
    nonce,
    clientId,
    credentialType
  ): Promise<{ credential: string }> => {
    const {
      credentialCryptoContext,
      walletProviderBaseUrl,
      appFetch = fetch,
    } = ctx;

    const credentialUrl =
      issuerConf.openid_credential_issuer.credential_endpoint;

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

    const { credential } = await appFetch(credentialUrl, {
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

    return { credential };
  };
