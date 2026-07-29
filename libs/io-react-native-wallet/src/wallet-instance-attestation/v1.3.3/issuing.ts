import {
  type CryptoContext,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";
import { Platform } from "react-native";

import type { IntegrityContext } from "../../utils/integrity";
import type { WalletInstanceAttestationApi } from "../api";
import type { WalletAttestationRequestParams } from "../api/types";

import { getWalletProviderClient } from "../../client";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { Logger, LogLevel } from "../../utils/logging";
import { WalletInstanceAttestationResponse } from "./types";

async function getAttestationRequest(
  {
    challenge,
    walletSolutionId,
    walletSolutionVersion,
  }: WalletAttestationRequestParams & { challenge: string },
  wiaCryptoContext: CryptoContext,
  integrityContext: IntegrityContext,
): Promise<string> {
  const jwk = await wiaCryptoContext.getPublicKey();
  const parsedJwk = JWK.parse(jwk);
  const keyThumbprint = await thumbprint(parsedJwk);
  const publicKey = { ...parsedJwk, kid: keyThumbprint };

  const clientData = {
    challenge,
    jwk_thumbprint: keyThumbprint,
  };

  const hardwareKeyTag = integrityContext.getHardwareKeyTag();
  const { authenticatorData, signature } =
    await integrityContext.getHardwareSignatureWithAuthData(
      JSON.stringify(clientData),
    );

  return new SignJWT(wiaCryptoContext)
    .setPayload({
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
      hardware_key_tag: hardwareKeyTag,
      hardware_signature: signature,
      integrity_assertion: authenticatorData,
      iss: hardwareKeyTag,
      nonce: challenge,
      platform: Platform.OS,
      wallet_solution_id: walletSolutionId,
      wallet_solution_version: walletSolutionVersion,
    })
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "wia-request+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
}

export const getAttestation: WalletInstanceAttestationApi["getAttestation"] =
  async (
    requestParams,
    { appFetch = fetch, integrityContext, wiaCryptoContext },
  ) => {
    const api = getWalletProviderClient({
      appFetch,
      walletProviderBaseUrl: requestParams.walletProviderBaseUrl,
    });

    const challenge = await api
      .get("/nonce")
      .then((response) => response.nonce);
    Logger.log(
      LogLevel.DEBUG,
      `Challenge obtained from ${requestParams.walletProviderBaseUrl}: ${challenge} `,
    );

    const signedAttestationRequest = await getAttestationRequest(
      { challenge, ...requestParams },
      wiaCryptoContext,
      integrityContext,
    );
    Logger.log(
      LogLevel.DEBUG,
      `Signed attestation request: ${signedAttestationRequest}`,
    );

    const response = await api
      .post("/wallet-instance-attestations", {
        body: signedAttestationRequest,
        header: {
          "Content-Type": "text/plain",
        },
      })
      .then(WalletInstanceAttestationResponse.parse);

    Logger.log(
      LogLevel.DEBUG,
      `Obtained Wallet Instance Attestation in jwt format: ${response.wallet_instance_attestation}`,
    );

    return [
      {
        attestation: response.wallet_instance_attestation,
        format: "jwt",
      },
    ];
  };
