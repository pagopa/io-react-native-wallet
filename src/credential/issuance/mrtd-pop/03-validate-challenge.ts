import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import { IssuerResponseError } from "../../../utils/errors";
import { hasStatusOrThrow, type Out } from "../../../utils/misc";
import { createPopToken } from "../../../utils/pop";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation";
import type { EvaluateIssuerTrust } from "../../issuance";
import {
  MrtdPopVerificationResult,
  type IasPayload,
  type MrtdPayload,
} from "./types";
import type { VerifyAndParseChallengeInfo } from "./01-verify-and-parse-challenge-info";

export type ValidateChallenge = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  verifyUrl: string,
  mrtd_auth_session: string,
  mrtd_pop_nonce: string,
  mrtd: MrtdPayload,
  ias: IasPayload,
  context: {
    wiaCryptoContext: CryptoContext;
    walletInstanceAttestation: string;
    appFetch?: GlobalFetch["fetch"];
  }
) => Promise<MrtdPopVerificationResult>;

export type BuildChallengeCallbackUrl = (
  redirectUri: Out<ValidateChallenge>["redirect_uri"],
  valPopNonce: Out<ValidateChallenge>["mrtd_val_pop_nonce"],
  authSession: Out<VerifyAndParseChallengeInfo>["mrtd_auth_session"]
) => Promise<{
  callbackUrl: string;
}>;

/**
 * Validates the MRTD signed challenge by sending the MRTD and IAS payloads to the issuer.
 * This function must be called after {@link initChallenge} and after obtaining the MRTD and IAS payloads
 * through the CIE PACE process.
 *
 * @param issuerConf - The issuer configuration containing the JWKS for signature verification.
 * @param verifyUrl - The endpoint to call to validate the challenge.
 * @param mrtd_auth_session - Session identifier for session binding obtained from the MRTD Proof JWT.
 * @param mrtd_pop_nonce - Nonce value obtained from the MRTD Proof JWT.
 * @param mrtd - MRTD validation data containing Data Groups and SOD.
 * @param ias - IAS validation data containing Anti-Cloning Public Key, and SOD.
 * @param context - The context containing the WIA crypto context used to retrieve the client public key,
 * the wallet instance attestation and an optional fetch implementation.
 * @returns The MRTD PoP Verification Result containing the validation nonce and redirect URI to complete the flow.
 */
export const validateChallenge: ValidateChallenge = async (
  issuerConf,
  verifyUrl,
  mrtd_auth_session,
  mrtd_pop_nonce,
  mrtd,
  ias,
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

  const { kid } = await wiaCryptoContext.getPublicKey();

  const mrtd_validation_jwt = await new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      typ: "mrtd-ias+jwt",
      kid,
    })
    .setPayload({
      iss,
      aud,
      document_type: "cie",
      mrtd,
      ias,
    })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign();

  const requestBody = {
    mrtd_validation_jwt,
    mrtd_auth_session,
    mrtd_pop_nonce,
  };

  const verifyResult = await appFetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "OAuth-Client-Attestation": walletInstanceAttestation,
      "OAuth-Client-Attestation-PoP": signedWiaPoP,
    },
    body: JSON.stringify(requestBody),
  })
    .then(hasStatusOrThrow(202, IssuerResponseError))
    .then((res) => res.json());

  const verifyResultParsed = MrtdPopVerificationResult.parse(verifyResult);
  return verifyResultParsed;
};

/**
 * WARNING: This function must be called after {@link validateChallenge}. The generated authUrl must be used to open a browser or webview capable of catching the redirectSchema to perform a get request to the authorization endpoint.
 * Builds the callback URL to which the end user should be redirected to continue the authentication flow after the MRTD challenge validation.
 * @param redirectUri - The redirect URI provided by the issuer after the challenge validation to continue the authentication flow.
 * @param valPopNonce - The MRTD validation PoP nonce obtained from the challenge validation response.
 * @param authSession - The MRTD authentication session identifier used for session binding.
 * @returns An object containing the callback URL
 */
export const buildChallengeCallbackUrl: BuildChallengeCallbackUrl = async (
  redirectUri,
  valPopNonce,
  authSession
) => {
  const params = new URLSearchParams({
    mrtd_val_pop_nonce: valPopNonce,
    mrtd_auth_session: authSession,
  });

  const callbackUrl = `${redirectUri}?${params}`;
  return { callbackUrl };
};
