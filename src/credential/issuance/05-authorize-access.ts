import { hasStatus, type Out } from "../../../src/utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import { withEphemeralKey } from "../../../src/utils/crypto";
import { createDPopToken } from "../../../src/utils/dpop";
import uuid from "react-native-uuid";
import { createPopToken } from "../../../src/utils/pop";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { ASSERTION_TYPE } from "./const";
import { TokenResponse } from "./types";
import { ValidationFailed } from "../../../src/utils/errors";
import type { CompleteUserAuthorizationWithQueryMode } from "./04-complete-user-authorization";

export type AuthorizeAccess = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  code: Out<CompleteUserAuthorizationWithQueryMode>["code"],
  redirectUri: string,
  clientId: Out<StartUserAuthorization>["clientId"],
  codeVerifier: Out<StartUserAuthorization>["codeVerifier"],
  context: {
    walletInstanceAttestation: string;
    appFetch?: GlobalFetch["fetch"];
    wiaCryptoContext: CryptoContext;
  }
) => Promise<{ accessToken: TokenResponse; tokenRequestSignedDPop: string }>;

/**
 * Creates and sends the DPoP Proof JWT to be presented with the authorization code to the /token endpoint of the authorization server
 * for requesting the issuance of an access token bound to the public key of the Wallet Instance contained within the DPoP.
 * This enables the Wallet Instance to request a digital credential.
 * The DPoP Proof JWT is generated according to the section 4.3 of the DPoP RFC 9449 specification.
 */
export const authorizeAccess: AuthorizeAccess = async (
  issuerConf,
  code,
  clientId,
  redirectUri,
  codeVerifier,
  context
) => {
  const {
    appFetch = fetch,
    walletInstanceAttestation,
    wiaCryptoContext,
  } = context;

  const parEndpoint =
    issuerConf.oauth_authorization_server.pushed_authorization_request_endpoint;
  const parUrl = new URL(parEndpoint);
  const aud = `${parUrl.protocol}//${parUrl.hostname}`;
  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  const tokenUrl = issuerConf.oauth_authorization_server.token_endpoint;
  // Use an ephemeral key to be destroyed after use
  const tokenRequestSignedDPop = await withEphemeralKey(
    async (ephimeralContext) => {
      return await createDPopToken(
        {
          htm: "POST",
          htu: tokenUrl,
          jti: `${uuid.v4()}`,
        },
        ephimeralContext
      );
    }
  );

  const signedWiaPoP = await createPopToken(
    {
      jti: `${uuid.v4()}`,
      aud,
      iss,
    },
    wiaCryptoContext
  );

  const requestBody = {
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_assertion_type: ASSERTION_TYPE,
    client_assertion: walletInstanceAttestation + "~" + signedWiaPoP,
  };

  const authorizationRequestFormBody = new URLSearchParams(requestBody);
  const tokenRes = await appFetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: tokenRequestSignedDPop,
    },
    body: authorizationRequestFormBody.toString(),
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((body) => TokenResponse.safeParse(body));

  if (!tokenRes.success) {
    throw new ValidationFailed(tokenRes.error.message);
  }

  return { accessToken: tokenRes.data, tokenRequestSignedDPop };
};
