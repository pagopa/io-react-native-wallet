import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import { createDPopToken } from "../../utils/dpop";
import { v4 as uuidv4 } from "uuid";
import { createPopToken } from "../../utils/pop";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { TokenResponse } from "./types";
import { IssuerResponseError, ValidationFailed } from "../../utils/errors";
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
    dPopCryptoContext: CryptoContext;
  }
) => Promise<{ accessToken: TokenResponse }>;

/**
 * Creates and sends the DPoP Proof JWT to be presented with the authorization code to the /token endpoint of the authorization server
 * for requesting the issuance of an access token bound to the public key of the Wallet Instance contained within the DPoP.
 * This enables the Wallet Instance to request a digital credential.
 * The DPoP Proof JWT is generated according to the section 4.3 of the DPoP RFC 9449 specification.
 * @param issuerConf The issuer configuration returned by {@link evaluateIssuerTrust}
 * @param code The authorization code returned by {@link completeUserAuthorizationWithQueryMode} or {@link completeUserAuthorizationWithFormPost}
 * @param redirectUri The redirect URI which is the custom URL scheme that the Wallet Instance is registered to handle
 * @param clientId The client id returned by {@link startUserAuthorization}
 * @param codeVerifier The code verifier returned by {@link startUserAuthorization}
 * @param context.walletInstanceAttestation The Wallet Instance's attestation
 * @param context.wiaCryptoContext The Wallet Instance's crypto context
 * @param context.dPopCryptoContext The DPoP crypto context
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @throws {ValidationFailed} if an error occurs while parsing the token response
 * @throws {IssuerResponseError} with a specific code for more context
 * @return The token response containing the access token along with the token request signed with DPoP which has to be used in the {@link obtainCredential} step.
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
    dPopCryptoContext,
  } = context;

  const parEndpoint =
    issuerConf.oauth_authorization_server.pushed_authorization_request_endpoint;
  const parUrl = new URL(parEndpoint);
  const aud = `${parUrl.protocol}//${parUrl.hostname}`;
  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  const tokenUrl = issuerConf.oauth_authorization_server.token_endpoint;

  const tokenRequestSignedDPop = await createDPopToken(
    {
      htm: "POST",
      htu: tokenUrl,
      jti: `${uuidv4()}`,
    },
    dPopCryptoContext
  );

  const signedWiaPoP = await createPopToken(
    {
      jti: `${uuidv4()}`,
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
  };

  const authorizationRequestFormBody = new URLSearchParams(requestBody);
  const tokenRes = await appFetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: tokenRequestSignedDPop,
      "OAuth-Client-Attestation": walletInstanceAttestation,
      "OAuth-Client-Attestation-PoP": signedWiaPoP,
    },
    body: authorizationRequestFormBody.toString(),
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json())
    .then((body) => TokenResponse.safeParse(body));

  if (!tokenRes.success) {
    throw new ValidationFailed({
      message: "Token Response validation failed",
      reason: tokenRes.error.message,
    });
  }

  return { accessToken: tokenRes.data };
};
