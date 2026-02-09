import { SignJWT } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import { IssuerResponseError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import { createPopToken } from "../../../utils/pop";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils"; // TODO: decouple from 1.0.0 version
import { MrtdPopVerificationResult } from "../api/mrtd-pop";
import type { MRTDPoPApi } from "../api/mrtd-pop";

export const validateChallenge: MRTDPoPApi["validateChallenge"] = async (
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

export const buildChallengeCallbackUrl: MRTDPoPApi["buildChallengeCallbackUrl"] =
  async (redirectUri, valPopNonce, authSession) => {
    const params = new URLSearchParams({
      mrtd_val_pop_nonce: valPopNonce,
      mrtd_auth_session: authSession,
    });

    const callbackUrl = `${redirectUri}?${params}`;
    return { callbackUrl };
  };
