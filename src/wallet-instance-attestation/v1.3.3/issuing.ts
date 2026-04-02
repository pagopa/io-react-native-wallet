import { Platform } from "react-native";
import {
  thumbprint,
  type CryptoContext,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import type { IntegrityContext } from "../../utils/integrity";
import { LogLevel, Logger } from "../../utils/logging";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { getWalletProviderClient } from "../../client";
import type { WalletAttestationRequestParams } from "../api/types";
import type { WalletInstanceAttestationApi } from "../api";
import { WalletInstanceAttestationResponse } from "./types";

async function getAttestationRequest(
  {
    challenge,
    walletSolutionId,
    walletSolutionVersion,
  }: WalletAttestationRequestParams & { challenge: string },
  wiaCryptoContext: CryptoContext,
  integrityContext: IntegrityContext
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
  const { signature, authenticatorData } =
    await integrityContext.getHardwareSignatureWithAuthData(
      JSON.stringify(clientData)
    );

  return new SignJWT(wiaCryptoContext)
    .setPayload({
      iss: hardwareKeyTag,
      nonce: challenge,
      platform: Platform.OS,
      hardware_signature: signature,
      integrity_assertion: authenticatorData,
      hardware_key_tag: hardwareKeyTag,
      wallet_solution_id: walletSolutionId,
      wallet_solution_version: walletSolutionVersion,
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
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
    { wiaCryptoContext, integrityContext, appFetch = fetch }
  ) => {
    const api = getWalletProviderClient({
      walletProviderBaseUrl: requestParams.walletProviderBaseUrl,
      appFetch,
    });

    const challenge = await api
      .get("/nonce")
      .then((response) => response.nonce);
    Logger.log(
      LogLevel.DEBUG,
      `Challenge obtained from ${requestParams.walletProviderBaseUrl}: ${challenge} `
    );

    const signedAttestationRequest = await getAttestationRequest(
      { challenge, ...requestParams },
      wiaCryptoContext,
      integrityContext
    );
    Logger.log(
      LogLevel.DEBUG,
      `Signed attestation request: ${signedAttestationRequest}`
    );

    const response = await api
      .post("/wallet-instance-attestations", {
        header: {
          "Content-Type": "text/plain",
        },
        body: signedAttestationRequest,
      })
      .then(WalletInstanceAttestationResponse.parse);

    Logger.log(
      LogLevel.DEBUG,
      `Obtained Wallet Instance Attestation in jwt format: ${response.wallet_instance_attestation}`
    );

    return [
      {
        format: "jwt",
        attestation: response.wallet_instance_attestation,
      },
    ];
  };
