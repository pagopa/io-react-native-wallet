import uuid from "react-native-uuid";
import { withEphemeralKey } from "../../utils/crypto";
import { createDPopToken } from "../../utils/dpop";
import { TokenError } from "../../utils/errors";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import type { Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { ASSERTION_TYPE } from "./const";
import type { CompleteUserAuthorization } from "./04-complete-user-authorization";

export type AuthorizeAccess = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  code: Out<CompleteUserAuthorization>["code"],
  clientId: Out<StartUserAuthorization>["clientId"],
  context: {
    walletInstanceAttestation: string;
    walletProviderBaseUrl: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{
  // The access token to grant access to the credential
  accessToken: string;
  // The nonce, to prevent reply attacks
  nonce: string;
  // Same as input
  clientId: string;
}>;

/**
 * Obtain the access token to finally request the credential
 *
 * @param issuerConf The Issuer configuration
 * @param code The access code from the User authorization phase
 * @param clientId Identifies the current client across all the requests of the issuing flow
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.walletProviderBaseUrl The base url of the Wallet Provider
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns
 */
export const authorizeAccess: AuthorizeAccess = async (
  issuerConf,
  code,
  clientId,
  context
): Promise<{ accessToken: string; nonce: string; clientId: string }> => {
  const {
    appFetch = fetch,
    walletInstanceAttestation,
    walletProviderBaseUrl,
  } = context;

  const tokenUrl = issuerConf.openid_credential_issuer.token_endpoint;

  // Use an ephemeral key to be destroyed after use
  const signedDPop = await withEphemeralKey((ephemeralContext) =>
    createDPopToken(
      {
        htm: "POST",
        htu: tokenUrl,
        jti: `${uuid.v4()}`,
      },
      ephemeralContext
    )
  );

  const codeVerifier = `${uuid.v4()}`;
  const requestBody = {
    grant_type: "authorization code",
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    client_assertion_type: ASSERTION_TYPE,
    client_assertion: walletInstanceAttestation,
    redirect_uri: walletProviderBaseUrl,
  };
  var formBody = new URLSearchParams(requestBody);

  const response = await appFetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: signedDPop,
    },
    body: formBody.toString(),
  });

  if (response.status === 200) {
    const { c_nonce, access_token } = await response.json();
    return {
      accessToken: access_token,
      nonce: c_nonce,
      clientId,
    };
  }
  throw new TokenError(
    `Unable to obtain token. Response code: ${await response.text()}`
  );
};
