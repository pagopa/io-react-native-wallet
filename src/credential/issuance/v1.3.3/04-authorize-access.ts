import { SignJWT } from "@pagopa/io-react-native-jwt";
import { createTokenDPoP, fetchTokenResponse } from "@pagopa/io-wallet-oauth2";
import { v4 as uuidv4 } from "uuid";
import { createPopToken } from "../../../utils/pop";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils";
import { partialCallbacks } from "../../../utils/callbacks";
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

  const dPopSignerJwk = await dPopCryptoContext.getPublicKey();
  const tokenDPoP = await createTokenDPoP({
    callbacks: {
      ...partialCallbacks,
      signJwt: async (_, payload) => ({
        jwt: await new SignJWT(wiaCryptoContext).setPayload(payload).sign(),
        signerJwk: dPopSignerJwk,
      }),
    },
    signer: {
      alg: "ES256",
      method: "jwk",
      publicJwk: dPopSignerJwk,
    },
    tokenRequest: {
      method: "POST",
      url: issuerConf.token_endpoint,
    },
  });

  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  const signedWiaPoP = await createPopToken(
    {
      jti: uuidv4(),
      aud: issuerConf.credential_issuer,
      iss,
    },
    wiaCryptoContext
  );

  const tokenResponse = await fetchTokenResponse({
    accessTokenEndpoint: issuerConf.token_endpoint,
    callbacks: {
      ...partialCallbacks,
      fetch: appFetch,
    },
    walletAttestation: walletInstanceAttestation,
    dPoP: tokenDPoP.jwt,
    clientAttestationDPoP: signedWiaPoP,
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
