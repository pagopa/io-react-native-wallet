import {
  type CryptoContext,
  decode as decodeJwt,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";
import { Platform } from "react-native";

import type { IntegrityContext } from "../../utils/integrity";

import { getWalletProviderClient } from "../../client";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { Logger, LogLevel } from "../../utils/logging";
import {
  WalletAttestationJwt,
  type WalletAttestationRequestParams,
  WalletAttestationResponse,
} from "./types";

/**
 * Build the Wallet Attestation request, signed with the key to bind to the attestation
 * and with the hardware key of the Wallet Instance.
 */
const getAttestationRequest = async (
  {
    challenge,
    walletSolutionId,
    walletSolutionVersion,
  }: WalletAttestationRequestParams & { challenge: string },
  wiaCryptoContext: CryptoContext,
  integrityContext: IntegrityContext,
): Promise<string> => {
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
};

/**
 * Request a Wallet Attestation to the EUDI Wallet Provider, used by the wallet to authenticate
 * to the Credential Issuers (OAuth 2.0 Attestation-Based Client Authentication, HAIP Section 4.4.1).
 * Copy of the IT-Wallet v1.4.6 implementation, kept separate to evolve with the EUDI Wallet Provider.
 *
 * @param requestParams Wallet Provider data for the Wallet Attestation request
 * @param ctx.wiaCryptoContext The key pair to bind to the attestation, used to prove its ownership
 * @param ctx.integrityContext The hardware key pair associated with the Wallet Instance
 * @param ctx.appFetch (optional) Http client
 * @returns The Wallet Attestation in JWT format
 * @throws {WalletProviderResponseError} with a specific code for more context
 */
export const getWalletAttestation = async (
  requestParams: WalletAttestationRequestParams,
  {
    appFetch = fetch,
    integrityContext,
    wiaCryptoContext,
  }: {
    appFetch?: typeof fetch;
    integrityContext: IntegrityContext;
    wiaCryptoContext: CryptoContext;
  },
): Promise<string> => {
  const api = getWalletProviderClient({
    appFetch,
    walletProviderBaseUrl: requestParams.walletProviderBaseUrl,
  });

  const challenge = await api.get("/nonce").then((response) => response.nonce);
  Logger.log(
    LogLevel.DEBUG,
    `Challenge obtained from ${requestParams.walletProviderBaseUrl}: ${challenge}`,
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
    .then(WalletAttestationResponse.parse);

  Logger.log(
    LogLevel.DEBUG,
    `Obtained Wallet Attestation: ${response.wallet_instance_attestation}`,
  );

  return response.wallet_instance_attestation;
};

/**
 * Decode a Wallet Attestation, ensuring it has a valid shape.
 * It DOES NOT verify the signature.
 */
export const decodeWalletAttestation = (
  token: string,
): WalletAttestationJwt => {
  const { payload, protectedHeader } = decodeJwt(token);
  return WalletAttestationJwt.parse({ header: protectedHeader, payload });
};
