import {
  createClientAttestationPopJwt,
  createTokenDPoP,
  fetchTokenResponse,
} from "@pagopa/io-wallet-oauth2";
import { v4 as uuidv4 } from "uuid";

import type { IssuanceApi, TokenResponse } from "../api";

import {
  createSignJwtFromSigner,
  partialCallbacks,
} from "../../../utils/callbacks";
import { sdkConfigV1_4 } from "../../../utils/config";
import { IoWalletError } from "../../../utils/errors";

export const authorizeAccess: IssuanceApi["authorizeAccess"] = async (
  issuerConf,
  code,
  redirectUri,
  codeVerifier,
  context,
) => {
  const {
    appFetch = fetch,
    dPopSigner,
    walletInstanceAttestation,
    wiaSigner,
  } = context;

  const tokenDPoP = await createTokenDPoP({
    callbacks: {
      ...partialCallbacks,
      signJwt: createSignJwtFromSigner(dPopSigner),
    },
    jti: uuidv4(),
    signer: {
      alg: "ES256",
      method: "jwk",
      publicJwk: await dPopSigner.getPublicKey(),
    },
    tokenRequest: {
      method: "POST",
      url: issuerConf.token_endpoint,
    },
  });

  const clientAttestationDPoP = await createClientAttestationPopJwt({
    authorizationServer: issuerConf.credential_issuer,
    callbacks: {
      generateRandom: partialCallbacks.generateRandom,
      signJwt: createSignJwtFromSigner(wiaSigner),
    },
    clientAttestation: walletInstanceAttestation,
    config: sdkConfigV1_4,
    signer: {
      alg: "ES256",
      method: "jwk",
      publicJwk: await wiaSigner.getPublicKey(),
    },
  });

  const tokenResponse = await fetchTokenResponse({
    accessTokenEndpoint: issuerConf.token_endpoint,
    accessTokenRequest: {
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    },
    callbacks: {
      ...partialCallbacks,
      fetch: appFetch,
    },
    clientAttestationDPoP,
    dPoP: tokenDPoP.jwt,
    walletAttestation: walletInstanceAttestation,
  });

  // `authorization_details` might be undefined if the PAR used `scope`.
  // We currently do not support `scope` only.
  if (!tokenResponse.authorization_details) {
    throw new IoWalletError(
      "Access token without authorization_details is not supported",
    );
  }

  return {
    accessToken: tokenResponse as TokenResponse,
  };
};
