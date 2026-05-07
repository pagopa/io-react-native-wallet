import {
  createClientAttestationPopJwt,
  fetchMrtdPopInit,
} from "@pagopa/io-wallet-oauth2";
import { UnexpectedStatusCodeError as SdkUnexpectedStatusCodeError } from "@pagopa/io-wallet-utils";
import { Logger, LogLevel } from "../../../utils/logging";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
} from "../../../utils/errors";
import type { MRTDPoPApi } from "../api/mrtd-pop";
import {
  createSignJwtFromCryptoContext,
  createVerifyJwtFromJwks,
  partialCallbacks,
} from "../../../utils/callbacks";

export const initChallenge: MRTDPoPApi["initChallenge"] = async (
  issuerConf,
  initUrl,
  mrtd_auth_session,
  mrtd_pop_jwt_nonce,
  context
) => {
  const {
    appFetch = fetch,
    walletInstanceAttestation,
    wiaCryptoContext,
  } = context;

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

  const initResult = await fetchMrtdPopInit({
    popInitEndpoint: initUrl,
    mrtdAuthSession: mrtd_auth_session,
    mrtdPopJwtNonce: mrtd_pop_jwt_nonce,
    walletAttestation: walletInstanceAttestation,
    clientAttestationDPoP,
    callbacks: {
      verifyJwt: createVerifyJwtFromJwks(issuerConf.keys),
      fetch: appFetch,
    },
  }).catch(handleInitChallengeError);

  return {
    challenge: initResult.challenge,
    mrtd_pop_nonce: initResult.mrtdPopNonce,
    pop_verify_endpoint: initResult.popVerifyEndpoint,
    mrz: initResult.mrz,
  };
};

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
