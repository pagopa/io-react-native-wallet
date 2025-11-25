import { v4 as uuidv4 } from "uuid";
import { Logger, LogLevel } from "../../utils/logging";
import { hasStatusOrThrow } from "../../utils/misc";
import { createDPopToken } from "../../utils/dpop";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { IoWalletError, UnexpectedStatusCodeError } from "../../utils/errors";
import { type TokenResponse, TokenResponseSchema } from "./types";

export type AuthorizeAccessParams = {
  tokenEndpoint: string;
  authorizationCode: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
};

export type AuthorizeAccessContext = {
  appFetch: GlobalFetch["fetch"];
  dpopCryptoContext: CryptoContext;
};

/**
 * Creates and sends the DPoP Proof JWT to be presented with the authorization code to the /token endpoint of the authorization server
 * for requesting the issuance of an access token bound to the public key of the DPoP.
 * This enables the Wallet Instance to request a digital credential.
 * The DPoP Proof JWT is generated according to the section 4.3 of the DPoP RFC 9449 specification.
 * @param params Parameters required to authorize access
 * @param params.tokenEndpoint The token endpoint URL of the authorization server
 * @param params.authorizationCode The authorization code received from the authorization server
 * @param params.redirectUri The redirect URI used in the authorization request
 * @param params.clientId The client ID of the Wallet Instance
 * @param params.codeVerifier The PKCE code verifier used in the authorization request
 * @param context The context containing dependencies
 * @param context.appFetch fetch api implementation
 * @param context.dpopCryptoContext The DPoP crypto context
 */
export const authorizeAccess = async (
  params: AuthorizeAccessParams,
  context: AuthorizeAccessContext
): Promise<TokenResponse> => {
  const { appFetch, dpopCryptoContext } = context;
  const {
    tokenEndpoint,
    authorizationCode,
    redirectUri,
    clientId,
    codeVerifier,
  } = params;

  const requestBody = {
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  };

  const body = new URLSearchParams(requestBody);

  const dpopProof = await createDPopToken(
    {
      htm: "POST",
      htu: tokenEndpoint,
      jti: `${uuidv4()}`,
    },
    dpopCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `Token request DPoP: ${dpopProof}`);

  Logger.log(LogLevel.INFO, `Requesting access token from: ${tokenEndpoint}`);

  const response = await appFetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: dpopProof,
    },
    body: body.toString(),
  })
    .then(hasStatusOrThrow(200, UnexpectedStatusCodeError))
    .then((res) => res.json());

  const tokenResult = TokenResponseSchema.safeParse(response);

  if (!tokenResult.success) {
    Logger.log(
      LogLevel.ERROR,
      `Invalid token response: ${tokenResult.error.message}`
    );
    throw new IoWalletError(tokenResult.error.message);
  }

  if (tokenResult.data.token_type.toLowerCase() !== "dpop") {
    Logger.log(
      LogLevel.WARN,
      `Token endpoint did not return a DPoP token (received: ${tokenResult.data.token_type})`
    );
  }

  Logger.log(LogLevel.INFO, "Access Token received successfully.");
  return tokenResult.data;
};
