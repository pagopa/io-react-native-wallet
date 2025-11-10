import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { LogLevel, Logger } from "../../utils/logging";
import { v4 as uuidv4 } from "uuid";
import { createPopToken } from "../../utils/pop";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation";
import type { EvaluateIssuerTrust } from "../issuance";
import { IssuerResponseError } from "../../utils/errors";

export type InitChallenge = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  htu: string,
  mrtd_auth_session: string,
  mrtd_pop_jwt_nonce: string,
  context: {
    wiaCryptoContext: CryptoContext;
    walletInstanceAttestation: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<{}>;

export const initChallgenge: InitChallenge = async (
  issuerConf,
  htu,
  mrtd_auth_session,
  mrtd_pop_jwt_nonce,
  context
) => {
  const {
    appFetch = fetch,
    walletInstanceAttestation,
    wiaCryptoContext,
  } = context;

  const aud = issuerConf.openid_credential_issuer.credential_issuer;
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

  Logger.log(LogLevel.DEBUG, `WIA DPoP token: ${signedWiaPoP}`);

  const requestBody = {
    mrtd_auth_session,
    mrtd_pop_jwt_nonce,
  };

  const authorizationRequestFormBody = new URLSearchParams(requestBody);

  Logger.log(
    LogLevel.DEBUG,
    `Auth form request body: ${authorizationRequestFormBody}`
  );

  const mrtdPoPJwtResponse = await appFetch(htu, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "OAuth-Client-Attestation": walletInstanceAttestation,
      "OAuth-Client-Attestation-PoP": signedWiaPoP,
    },
    body: authorizationRequestFormBody.toString(),
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json());

  return {};
};
