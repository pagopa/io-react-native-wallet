import type { IoWalletSdkConfig } from "@pagopa/io-wallet-utils";

import { SignJWT } from "@pagopa/io-react-native-jwt";
import {
  createClientAttestationPopJwt,
  fetchMrtdPopVerify,
} from "@pagopa/io-wallet-oauth2";

import type { MRTDPoPApi } from "../api/mrtd-pop";

import {
  createSignJwtFromCryptoContext,
  partialCallbacks,
} from "../../../utils/callbacks";
import { sdkUnexpectedStatusCodeToIssuerError } from "../../../utils/errors";

interface Config {
  sdkConfig: IoWalletSdkConfig;
}

/**
 * Factory function to create `validateChallenge` for MRTD PoP flow.
 * The factory is needed to inject version specific SDK configuration.
 * @param config Configuration object containing the IO Wallet SDK configuration
 * @returns `validateChallenge` function compliant with the public API
 */
export function createValidateChallenge(
  config: Config,
): MRTDPoPApi["validateChallenge"] {
  return async function validateChallenge(
    issuerConf,
    verifyUrl,
    mrtd_auth_session,
    mrtd_pop_nonce,
    mrtd,
    ias,
    context,
  ) {
    const {
      appFetch = fetch,
      walletInstanceAttestation,
      wiaCryptoContext,
    } = context;

    const aud = issuerConf.credential_issuer;

    const wiaPublicJwk = await wiaCryptoContext.getPublicKey();

    const clientAttestationDPoP = await createClientAttestationPopJwt({
      authorizationServer: aud,
      callbacks: {
        generateRandom: partialCallbacks.generateRandom,
        signJwt: createSignJwtFromCryptoContext(wiaCryptoContext),
      },
      clientAttestation: walletInstanceAttestation,
      config: config.sdkConfig,
      signer: {
        alg: "ES256",
        method: "jwk",
        publicJwk: wiaPublicJwk,
      },
    });

    const mrtdValidationJwt = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        kid: wiaPublicJwk.kid,
        typ: "mrtd-ias+jwt",
      })
      .setPayload({
        aud,
        document_type: "cie",
        ias,
        iss: wiaPublicJwk.kid,
        mrtd,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign();

    const verifyResult = await fetchMrtdPopVerify({
      callbacks: {
        fetch: appFetch,
        ...partialCallbacks,
      },
      clientAttestationDPoP,
      mrtdAuthSession: mrtd_auth_session,
      mrtdPopNonce: mrtd_pop_nonce,
      mrtdValidationJwt,
      popVerifyEndpoint: verifyUrl,
      walletAttestation: walletInstanceAttestation,
    }).catch(sdkUnexpectedStatusCodeToIssuerError);

    return {
      mrtd_val_pop_nonce: verifyResult.mrtdValPopNonce,
      redirect_uri: verifyResult.redirectUri,
    };
  };
}

export const buildChallengeCallbackUrl: MRTDPoPApi["buildChallengeCallbackUrl"] =
  async (redirectUri, valPopNonce, authSession) => {
    const params = new URLSearchParams({
      mrtd_auth_session: authSession,
      mrtd_val_pop_nonce: valPopNonce,
    });

    const callbackUrl = `${redirectUri}?${params}`;
    return { callbackUrl };
  };
