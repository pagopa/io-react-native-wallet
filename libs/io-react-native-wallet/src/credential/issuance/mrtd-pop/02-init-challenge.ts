import {
  createClientAttestationPopJwt,
  fetchMrtdPopInit,
} from "@pagopa/io-wallet-oauth2";
import {
  IoWalletSdkConfig,
  UnexpectedStatusCodeError as SdkUnexpectedStatusCodeError,
} from "@pagopa/io-wallet-utils";

import type { MRTDPoPApi } from "../api/mrtd-pop";

import {
  createSignJwtFromCryptoContext,
  createVerifyJwtFromJwks,
  partialCallbacks,
} from "../../../utils/callbacks";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
} from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";

interface Config {
  sdkConfig: IoWalletSdkConfig;
}

/**
 * Factory function to create `initChallenge` for MRTD PoP flow.
 * The factory is needed to inject version specific SDK configuration.
 * @param config Configuration object containing the IO Wallet SDK configuration
 * @returns `initChallenge` function compliant with the public API
 */
export function createInitChallenge(
  config: Config,
): MRTDPoPApi["initChallenge"] {
  return async function initChallenge(
    issuerConf,
    initUrl,
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
    context,
  ) {
    const {
      appFetch = fetch,
      walletInstanceAttestation,
      wiaCryptoContext,
    } = context;

    const clientAttestationDPoP = await createClientAttestationPopJwt({
      authorizationServer: issuerConf.credential_issuer,
      callbacks: {
        generateRandom: partialCallbacks.generateRandom,
        signJwt: createSignJwtFromCryptoContext(wiaCryptoContext),
      },
      clientAttestation: walletInstanceAttestation,
      config: config.sdkConfig,
      signer: {
        alg: "ES256",
        method: "jwk",
        publicJwk: await wiaCryptoContext.getPublicKey(),
      },
    });

    const initResult = await fetchMrtdPopInit({
      callbacks: {
        fetch: appFetch,
        verifyJwt: createVerifyJwtFromJwks(issuerConf.keys),
      },
      clientAttestationDPoP,
      mrtdAuthSession: mrtd_auth_session,
      mrtdPopJwtNonce: mrtd_pop_jwt_nonce,
      popInitEndpoint: initUrl,
      walletAttestation: walletInstanceAttestation,
    }).catch(handleInitChallengeError);

    return {
      challenge: initResult.challenge,
      mrtd_pop_nonce: initResult.mrtdPopNonce,
      mrz: initResult.mrz,
      pop_verify_endpoint: initResult.popVerifyEndpoint,
    };
  };
}

const handleInitChallengeError = (e: unknown) => {
  Logger.log(LogLevel.ERROR, `Failed to get MRTD challenge: ${e}`);

  if (!(e instanceof SdkUnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
    .handle("*", {
      code: IssuerResponseErrorCodes.MrtdChallengeInitRequestFailed,
      message: "Unable to initialize MRTD challenge",
    })
    .buildFrom(e);
};
