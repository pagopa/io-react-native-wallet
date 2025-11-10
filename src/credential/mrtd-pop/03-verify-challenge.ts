import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";
import { IssuerResponseError } from "../../utils/errors";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import { createPopToken } from "../../utils/pop";
import * as WalletInstanceAttestation from "../../wallet-instance-attestation";
import type { EvaluateIssuerTrust } from "../issuance";
import {
  MrtdPopVerificationResult,
  type IasPayload,
  type MrtdPayload,
} from "./types";

export type VerifyChallenge = (
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

export const verifyChallenge: VerifyChallenge = async (
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

  const mrtd_validation_jwt = new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      typ: "mrtd-ias+jwt",
      kid,
    })
    .setPayload({
      document_type: "cie",
      mrtd,
      ias,
    })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime("1h")
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
