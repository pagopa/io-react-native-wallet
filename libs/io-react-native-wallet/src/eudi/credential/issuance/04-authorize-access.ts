import type { CryptoContext } from "@pagopa/io-react-native-jwt";

import { v4 as uuidv4 } from "uuid";

import { createDPopToken } from "../../../utils/dpop";
import { IssuerResponseError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import { type AuthorizationServerMetadata, TokenResponse } from "./types";
import {
  type ClientAuthentication,
  fetchWithDPoP,
  getClientAuthenticationHeaders,
  getClientId,
  parseOrThrow,
} from "./utils";

export interface AuthorizeAccessParams {
  authorizationServerMetadata: AuthorizationServerMetadata;
  clientAuthentication: ClientAuthentication;
  code: string;
  codeVerifier: string;
  /** The key the access token is bound to with DPoP (RFC 9449) */
  dPopCryptoContext: CryptoContext;
  fetch?: typeof fetch;
  redirectUri: string;
}

/**
 * Exchanges the authorization code for a DPoP-bound access token
 * (OpenID4VCI 1.0, Section 6), authenticating the wallet as described by {@link ClientAuthentication}.
 *
 * @returns The Token Response
 * @throws {IssuerResponseError} If the Token Request fails
 * @throws {ValidationFailed} If the Token Response is not valid
 */
export const authorizeAccess = async ({
  authorizationServerMetadata,
  clientAuthentication,
  code,
  codeVerifier,
  dPopCryptoContext,
  fetch: fetchFn = fetch,
  redirectUri,
}: AuthorizeAccessParams): Promise<TokenResponse> => {
  const { issuer, token_endpoint } = authorizationServerMetadata;

  const body = new URLSearchParams({
    client_id: getClientId(clientAuthentication),
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetchWithDPoP(
    token_endpoint,
    {
      body: body.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(await getClientAuthenticationHeaders(clientAuthentication, issuer)),
      },
      method: "POST",
    },
    (nonce) =>
      createDPopToken(
        { htm: "POST", htu: token_endpoint, jti: uuidv4(), nonce },
        dPopCryptoContext,
      ),
    fetchFn,
  )
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json());

  return parseOrThrow(TokenResponse, tokenResponse, "Token Response");
};
