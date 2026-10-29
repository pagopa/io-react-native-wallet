import {
  createClientAttestationPopJwt,
  createTokenDPoP,
  fetchTokenResponse,
} from "@pagopa/io-wallet-oauth2";
import { CREDENTIAL_OFFER_GRANTS } from "@pagopa/io-wallet-oid4vci";
import { v4 as uuidv4 } from "uuid";

import type { IssuanceApi, TokenResponse } from "../api";

import {
  createSignJwtFromCryptoContext,
  partialCallbacks,
} from "../../../utils/callbacks";
import { sdkConfigV1_4 } from "../../../utils/config";
import { IoWalletError } from "../../../utils/errors";

export const authorizeAccess: IssuanceApi["authorizeAccess"] = async (
  issuerConf,
  accessTokenRequest,
  context,
) => {
  if (
    accessTokenRequest.grant_type !== CREDENTIAL_OFFER_GRANTS.AUTHORIZATION_CODE
  ) {
    throw new IoWalletError(
      "Pre-authorized code flow is only supported for APTITUDE",
    );
  }

  const {
    appFetch = fetch,
    dPopCryptoContext,
    walletInstanceAttestation,
    wiaCryptoContext,
  } = context;

  const tokenDPoP = await createTokenDPoP({
    callbacks: {
      ...partialCallbacks,
      signJwt: createSignJwtFromCryptoContext(dPopCryptoContext),
    },
    jti: uuidv4(),
    signer: {
      alg: "ES256",
      method: "jwk",
      publicJwk: await dPopCryptoContext.getPublicKey(),
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
      signJwt: createSignJwtFromCryptoContext(wiaCryptoContext),
    },
    clientAttestation: walletInstanceAttestation,
    config: sdkConfigV1_4,
    signer: {
      alg: "ES256",
      method: "jwk",
      publicJwk: await wiaCryptoContext.getPublicKey(),
    },
  });

  const tokenResponse = await fetchTokenResponse({
    accessTokenEndpoint: issuerConf.token_endpoint,
    accessTokenRequest,
    callbacks: {
      ...partialCallbacks,
      fetch: appFetch,
    },
    clientAttestationDPoP,
    config: sdkConfigV1_4,
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
