import { hasStatusOrThrow } from "../../../utils/misc";
import { v4 as uuidv4 } from "uuid";
import { createPopToken } from "../../../utils/pop";
import { Logger, LogLevel } from "../../../utils/logging";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils"; // TODO: decouple from version 1.0.0
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
} from "../../../utils/errors";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import type { MRTDPoPApi } from "../api/mrtd-pop";
import { MrtdPoPChallengeJwt } from "./types";

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

  const aud = issuerConf.credential_issuer;
  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  const signedWiaPoP = await createPopToken(
    {
      jti: `${uuidv4()}`,
      aud,
      iss,
    },
    wiaCryptoContext
  );

  const requestBody = {
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
  };

  const mrtdPoPChallengeJwt = await appFetch(initUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "OAuth-Client-Attestation": walletInstanceAttestation,
      "OAuth-Client-Attestation-PoP": signedWiaPoP,
    },
    body: JSON.stringify(requestBody),
  })
    .then(hasStatusOrThrow(202))
    .then((res) => res.text())
    .catch(handleInitChallengeError);

  const mrtdPoPChallengeDecoded = decodeJwt(mrtdPoPChallengeJwt);
  const { payload } = MrtdPoPChallengeJwt.parse(mrtdPoPChallengeDecoded);

  return payload;
};

const handleInitChallengeError = (e: unknown) => {
  Logger.log(LogLevel.ERROR, `Failed to get MRTD challenge: ${e}`);

  if (!(e instanceof UnexpectedStatusCodeError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(IssuerResponseError)
    .handle("*", {
      code: IssuerResponseErrorCodes.MrtdChallengeInitRequestFailed,
      message: "Unable to initialize MRTD challenge",
    })
    .buildFrom(e);
};
