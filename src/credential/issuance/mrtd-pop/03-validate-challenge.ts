import { SignJWT } from "@pagopa/io-react-native-jwt";
import {
  createClientAttestationPopJwt,
  fetchMrtdPopVerify,
} from "@pagopa/io-wallet-oauth2";
import type { IoWalletSdkConfig } from "@pagopa/io-wallet-utils";
import { sdkUnexpectedStatusCodeToIssuerError } from "../../../utils/errors";
import {
  createSignJwtFromCryptoContext,
  partialCallbacks,
} from "../../../utils/callbacks";
import type { MRTDPoPApi } from "../api/mrtd-pop";

type Config = {
  sdkConfig: IoWalletSdkConfig;
};

/**
 * Factory function to create `validateChallenge` for MRTD PoP flow
 * The factory is needed to inject version specific SDK configuration.
 * @param config Configuration object containing the Io Wallet SDK configuration
 * @returns `validateChallenge` function compliant with the public API
 */
export function createValidateChallenge(
  config: Config
): MRTDPoPApi["validateChallenge"] {
  return async function validateChallenge(
    issuerConf,
    verifyUrl,
    mrtd_auth_session,
    mrtd_pop_nonce,
    mrtd,
    ias,
    context
  ) {
    const {
      appFetch = fetch,
      walletInstanceAttestation,
      wiaCryptoContext,
    } = context;

    const aud = issuerConf.credential_issuer;

    const wiaPublicJwk = await wiaCryptoContext.getPublicKey();

    const clientAttestationDPoP = await createClientAttestationPopJwt({
      config: config.sdkConfig,
      callbacks: {
        generateRandom: partialCallbacks.generateRandom,
        signJwt: createSignJwtFromCryptoContext(wiaCryptoContext),
      },
      clientAttestation: walletInstanceAttestation,
      authorizationServer: aud,
      signer: {
        method: "jwk",
        alg: "ES256",
        publicJwk: wiaPublicJwk,
      },
    });

    const mrtdValidationJwt = await new SignJWT(wiaCryptoContext)
      .setProtectedHeader({
        typ: "mrtd-ias+jwt",
        kid: wiaPublicJwk.kid,
      })
      .setPayload({
        iss: wiaPublicJwk.kid,
        aud,
        document_type: "cie",
        mrtd,
        ias,
      })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign();

    const verifyResult = await fetchMrtdPopVerify({
      popVerifyEndpoint: verifyUrl,
      mrtdAuthSession: mrtd_auth_session,
      mrtdPopNonce: mrtd_pop_nonce,
      clientAttestationDPoP,
      mrtdValidationJwt,
      walletAttestation: walletInstanceAttestation,
      callbacks: {
        fetch: appFetch,
        ...partialCallbacks,
      },
    }).catch(sdkUnexpectedStatusCodeToIssuerError);

    return {
      redirect_uri: verifyResult.redirectUri,
      mrtd_val_pop_nonce: verifyResult.mrtdValPopNonce,
    };
  };
}

export const buildChallengeCallbackUrl: MRTDPoPApi["buildChallengeCallbackUrl"] =
  async (redirectUri, valPopNonce, authSession) => {
    const params = new URLSearchParams({
      mrtd_val_pop_nonce: valPopNonce,
      mrtd_auth_session: authSession,
    });

    const callbackUrl = `${redirectUri}?${params}`;
    return { callbackUrl };
  };
