import { thumbprint } from "@pagopa/io-react-native-jwt";
import { JWT } from "@pagopa/io-react-native-jwt";
import { Platform } from "react-native";

import type { IntegrityContext } from "../../utils/integrity";
import type { WalletInstanceAttestationApi } from "../api";
import type { WalletAttestationRequestParams } from "../api/types";

import { getWalletProviderClient } from "../../client";
import { type Signer } from "../../utils/crypto";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { Logger, LogLevel } from "../../utils/logging";
import { WalletInstanceAttestationResponse } from "./types";

async function getAttestationRequest(
  {
    challenge,
    walletSolutionId,
    walletSolutionVersion,
  }: WalletAttestationRequestParams & { challenge: string },
  wiaSigner: Signer,
  integrityContext: IntegrityContext,
): Promise<string> {
  const jwk = await wiaSigner.getPublicKey();
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

  return new JWT(publicKey)
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "wia-request+jwt",
    })
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
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign((v) => wiaSigner.sign(v));
}

export const getAttestation: WalletInstanceAttestationApi["getAttestation"] =
  async (requestParams, { appFetch = fetch, integrityContext, wiaSigner }) => {
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
      wiaSigner,
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
