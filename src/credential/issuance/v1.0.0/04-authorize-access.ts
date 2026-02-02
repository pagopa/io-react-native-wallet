import { v4 as uuidv4 } from "uuid";
import { hasStatusOrThrow } from "../../../utils/misc";
import { createDPopToken } from "../../../utils/dpop";
import { createPopToken } from "../../../utils/pop";
import { TokenResponse } from "./types";
import { IssuerResponseError, ValidationFailed } from "../../../utils/errors";
import { LogLevel, Logger } from "../../../utils/logging";
import type { AuthorizeAccessApi } from "../api/04-authorize-access";
// TODO: [SIW-3570] import from wallet-instance-attestation/v1.0.0
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation";

export const authorizeAccess: AuthorizeAccessApi["authorizeAccess"] = async (
  issuerConf,
  code,
  _,
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
    dPopCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `Token request DPoP: ${tokenRequestSignedDPop}`);

  const signedWiaPoP = await createPopToken(
    {
      jti: `${uuidv4()}`,
      aud,
      iss,
    },
    wiaCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `WIA DPoP token: ${signedWiaPoP}`);

  const requestBody = {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  };

  const authorizationRequestFormBody = new URLSearchParams(requestBody);

  Logger.log(
    LogLevel.DEBUG,
    `Auth form request body: ${authorizationRequestFormBody}`
  );

  const tokenRes = await appFetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: tokenRequestSignedDPop,
      "OAuth-Client-Attestation": walletInstanceAttestation,
      "OAuth-Client-Attestation-PoP": signedWiaPoP,
    },
    body: authorizationRequestFormBody.toString(),
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json())
    .then((body) => TokenResponse.safeParse(body));

  if (!tokenRes.success) {
    Logger.log(
      LogLevel.ERROR,
      `Token Response validation failed: ${tokenRes.error.message}`
    );

    throw new ValidationFailed({
      message: "Token Response validation failed",
      reason: tokenRes.error.message,
    });
  }

  return { accessToken: tokenRes.data };
};
