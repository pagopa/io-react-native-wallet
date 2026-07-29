import {
  type CryptoContext,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";

import type { IntegrityContext } from "../../utils/integrity";
import type { WalletInstanceAttestationApi } from "../api";

import { getWalletProviderClient } from "../../client";
import {
  ResponseErrorBuilder,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../../utils/errors";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { Logger, LogLevel } from "../../utils/logging";
import { mapToWalletAttestations } from "./mappers";
import { WalletAttestationResponse } from "./types";

/**
 * Getter for an attestation request. The attestation request is a JWT that will be sent to the Wallet Provider to request a Wallet Instance Attestation.
 *
 * @param challenge - The nonce received from the Wallet Provider which is part of the signed clientData
 * @param wiaCryptoContext - The key pair associated with the WIA. Will be use to prove the ownership of the attestation
 * @param integrityContext - The integrity context which exposes a set of functions to interact with the device integrity service
 * @param walletProviderBaseUrl - Base url for the Wallet Provider
 * @returns A JWT containing the attestation request
 */
async function getAttestationRequest(
  challenge: string,
  wiaCryptoContext: CryptoContext,
  integrityContext: IntegrityContext,
  walletProviderBaseUrl: string,
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
      aud: walletProviderBaseUrl,
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
      hardware_key_tag: hardwareKeyTag,
      hardware_signature: signature,
      integrity_assertion: authenticatorData,
      iss: keyThumbprint,
      nonce: challenge,
    })
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "wp-war+jwt",
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

    // 1. Get nonce from backend
    const challenge = await api
      .get("/nonce")
      .then((response) => response.nonce);
    Logger.log(
      LogLevel.DEBUG,
      `Challenge obtained from ${requestParams.walletProviderBaseUrl}: ${challenge} `,
    );

    // 2. Get a signed attestation request
    const signedAttestationRequest = await getAttestationRequest(
      challenge,
      wiaCryptoContext,
      integrityContext,
      requestParams.walletProviderBaseUrl,
    );
    Logger.log(
      LogLevel.DEBUG,
      `Signed attestation request: ${signedAttestationRequest}`,
    );

    // 3. Request WIA in multiple formats
    const response = await api
      .post("/wallet-attestations", {
        body: {
          assertion: signedAttestationRequest,
        },
      })
      .then(WalletAttestationResponse.parse)
      .catch(handleAttestationCreationError);

    for (const attestation of response.wallet_attestations) {
      Logger.log(
        LogLevel.DEBUG,
        `Obtained wallet attestation in ${attestation.format} format: ${attestation.wallet_attestation}`,
      );
    }

    return mapToWalletAttestations(response);
  };

const handleAttestationCreationError = (e: unknown) => {
  Logger.log(
    LogLevel.ERROR,
    `An error occurred while calling /wallet-attestation endpoint: ${e}`,
  );

  if (!(e instanceof WalletProviderResponseError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(WalletProviderResponseError)
    .handle(403, {
      code: WalletProviderResponseErrorCodes.WalletInstanceRevoked,
      message: "Unable to get an attestation for a revoked Wallet Instance",
    })
    .handle(404, {
      code: WalletProviderResponseErrorCodes.WalletInstanceNotFound,
      message:
        "Unable to get an attestation for a Wallet Instance that does not exist",
    })
    .handle(409, {
      code: WalletProviderResponseErrorCodes.WalletInstanceIntegrityFailed,
      message:
        "Unable to get an attestation for a Wallet Instance that failed the integrity check",
    })
    .handle("*", {
      code: WalletProviderResponseErrorCodes.WalletInstanceAttestationIssuingFailed,
      message: "Unable to obtain wallet instance attestation",
    })
    .buildFrom(e);
};
