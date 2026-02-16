import { SignJWT } from "@pagopa/io-react-native-jwt";
import { fetchMrtdPopVerify } from "@pagopa/io-wallet-oauth2";
import { v4 as uuidv4 } from "uuid";
import { createPopToken } from "../../../utils/pop";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils"; // TODO: decouple from 1.0.0 version
import type { MRTDPoPApi } from "../api/mrtd-pop";
import { partialCallbacks } from "../../../utils/callbacks";

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
      jti: uuidv4(),
      aud,
      iss,
    },
    wiaCryptoContext
  );

  const { kid } = await wiaCryptoContext.getPublicKey();

  const mrtdValidationJwt = await new SignJWT(wiaCryptoContext)
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

  const verifyResult = await fetchMrtdPopVerify({
    popVerifyEndpoint: verifyUrl,
    mrtdAuthSession: mrtd_auth_session,
    mrtdPopNonce: mrtd_pop_nonce,
    clientAttestationDPoP: signedWiaPoP,
    mrtdValidationJwt,
    walletAttestation: walletInstanceAttestation,
    callbacks: {
      fetch: appFetch,
      ...partialCallbacks,
    },
  });

  return {
    redirect_uri: verifyResult.redirectUri,
    mrtd_val_pop_nonce: verifyResult.mrtdValPopNonce,
  };
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
