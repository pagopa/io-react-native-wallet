import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import { createPopToken } from "../../utils/pop";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation";
import type { EvaluateIssuerTrust } from "../issuance";
import { IssuerResponseError } from "../../utils/errors";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { MrtdPoPChallenge } from "./types";

export type InitChallenge = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  initUrl: string,
  mrtd_auth_session: string,
  mrtd_pop_jwt_nonce: string,
  context: {
    wiaCryptoContext: CryptoContext;
    walletInstanceAttestation: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<MrtdPoPChallenge["payload"]>;

/**
 * Initialaized the MRTD challengw with the data received from the issuer after the primary authentication.
 * This function must be called after {@link verifyAndParseChallengeInfo}.
 *
 * @param issuerConf - The issuer configuration containing the JWKS for signature verification.
 * @param initUrl - The endpoint to call to initialize the challenge.
 * @param mrtd_auth_session - Session identifier for session binding btained from the MRTD Proof JWT.
 * @param mrtd_pop_jwt_nonce - Nonce value obtained from the MRTD Proof JWT.
 * @param context - The context containing the WIA crypto context used to retrieve the client public key,
 * the wallet instance attestation and an optional fetch implementation.
 * @returns The payload of the MRTD PoP Challenge JWT.
 */
export const initChallenge: InitChallenge = async (
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
    .then(hasStatusOrThrow(202, IssuerResponseError))
    .then((res) => res.text());

  const mrtdPoPChallengeDecoded = decodeJwt(mrtdPoPChallengeJwt);
  const { payload } = MrtdPoPChallenge.parse(mrtdPoPChallengeDecoded);

  return payload;
};
