import { v4 as uuidv4 } from "uuid";

import type { IssuanceApi } from "../api";

import { createDPopToken } from "../../../utils/dpop";
import { IssuerResponseError, ValidationFailed } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { hasStatusOrThrow } from "../../../utils/misc";
import { createPopToken } from "../../../utils/pop";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils";
import { TokenResponse } from "./types";

export const authorizeAccess: IssuanceApi["authorizeAccess"] = async (
  issuerConf,
  code,
  redirectUri,
  codeVerifier,
  context,
) => {
  const {
    appFetch = fetch,
    dPopCryptoContext,
    walletInstanceAttestation,
    wiaCryptoContext,
  } = context;
  const aud = issuerConf.credential_issuer;
  const iss = WalletInstanceAttestation.decode(walletInstanceAttestation)
    .payload.cnf.jwk.kid;

  const tokenUrl = issuerConf.token_endpoint;

  const tokenRequestSignedDPop = await createDPopToken(
    {
      htm: "POST",
      htu: tokenUrl,
      jti: `${uuidv4()}`,
    },
    dPopCryptoContext,
  );

  Logger.log(LogLevel.DEBUG, `Token request DPoP: ${tokenRequestSignedDPop}`);

  const signedWiaPoP = await createPopToken(
    {
      aud,
      iss,
      jti: `${uuidv4()}`,
    },
    wiaCryptoContext,
  );

  Logger.log(LogLevel.DEBUG, `WIA DPoP token: ${signedWiaPoP}`);

  const requestBody = {
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };

  const authorizationRequestFormBody = new URLSearchParams(requestBody);

  Logger.log(
    LogLevel.DEBUG,
    `Auth form request body: ${authorizationRequestFormBody}`,
  );

  const tokenRes = await appFetch(tokenUrl, {
    body: authorizationRequestFormBody.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: tokenRequestSignedDPop,
      "OAuth-Client-Attestation": walletInstanceAttestation,
      "OAuth-Client-Attestation-PoP": signedWiaPoP,
    },
    method: "POST",
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json())
    .then((body) => TokenResponse.safeParse(body));

  if (!tokenRes.success) {
    Logger.log(
      LogLevel.ERROR,
      `Token Response validation failed: ${tokenRes.error.message}`,
    );

    throw new ValidationFailed({
      message: "Token Response validation failed",
      reason: tokenRes.error.message,
    });
  }

  return { accessToken: tokenRes.data };
};
