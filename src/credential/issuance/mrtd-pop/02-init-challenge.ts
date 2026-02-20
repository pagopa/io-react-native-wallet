import { v4 as uuidv4 } from "uuid";
import { fetchMrtdPopInit } from "@pagopa/io-wallet-oauth2";
import { UnexpectedStatusCodeError as SdkUnexpectedStatusCodeError } from "@pagopa/io-wallet-utils";
import { createPopToken } from "../../../utils/pop";
import { Logger, LogLevel } from "../../../utils/logging";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils"; // TODO: decouple from version 1.0.0
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
} from "../../../utils/errors";
import type { MRTDPoPApi } from "../api/mrtd-pop";
import { createVerifyJwtFromJwks } from "../../../utils/callbacks";

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

  const initResult = await fetchMrtdPopInit({
    popInitEndpoint: initUrl,
    mrtdAuthSession: mrtd_auth_session,
    mrtdPopJwtNonce: mrtd_pop_jwt_nonce,
    walletAttestation: walletInstanceAttestation,
    clientAttestationDPoP: signedWiaPoP,
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
