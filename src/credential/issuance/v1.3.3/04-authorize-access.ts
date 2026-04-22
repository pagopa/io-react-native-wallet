import {
  createClientAttestationPopJwt,
  createTokenDPoP,
  fetchTokenResponse,
} from "@pagopa/io-wallet-oauth2";
import {
  createSignJwtFromCryptoContext,
  partialCallbacks,
} from "../../../utils/callbacks";
import { IoWalletError } from "../../../utils/errors";
import type { IssuanceApi, TokenResponse } from "../api";

export const authorizeAccess: IssuanceApi["authorizeAccess"] = async (
  issuerConf,
  code,
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

  const tokenDPoP = await createTokenDPoP({
    callbacks: {
      ...partialCallbacks,
      signJwt: createSignJwtFromCryptoContext(dPopCryptoContext),
    },
    signer: {
      method: "jwk",
      alg: "ES256",
      publicJwk: await dPopCryptoContext.getPublicKey(),
    },
    tokenRequest: {
      method: "POST",
      url: issuerConf.token_endpoint,
    },
  });

  const clientAttestationDPoP = await createClientAttestationPopJwt({
    callbacks: {
      generateRandom: partialCallbacks.generateRandom,
      signJwt: createSignJwtFromCryptoContext(wiaCryptoContext),
    },
    clientAttestation: walletInstanceAttestation,
    authorizationServer: issuerConf.credential_issuer,
    signer: {
      method: "jwk",
      alg: "ES256",
      publicJwk: await wiaCryptoContext.getPublicKey(),
    },
  });

  const tokenResponse = await fetchTokenResponse({
    accessTokenEndpoint: issuerConf.token_endpoint,
    callbacks: {
      ...partialCallbacks,
      fetch: appFetch,
    },
    walletAttestation: walletInstanceAttestation,
    dPoP: tokenDPoP.jwt,
    clientAttestationDPoP,
    accessTokenRequest: {
      code,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    },
  });

  // `authorization_details` might be undefined if the PAR used `scope`.
  // We currently do not support `scope` only.
  if (!tokenResponse.authorization_details) {
    throw new IoWalletError(
      "Access token without authorization_details is not supported"
    );
  }

  return {
    accessToken: tokenResponse as TokenResponse,
  };
};
