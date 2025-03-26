import {
  type CryptoContext,
  SignJWT,
  thumbprint,
} from "@pagopa/io-react-native-jwt";
import { fixBase64EncodingOnKey, JWK } from "../utils/jwk";
import { getWalletProviderClient } from "../client";
import type { IntegrityContext } from "..";
import {
  ResponseErrorBuilder,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../utils/errors";
import { TokenResponse } from "./types";
import { DebugLevel, Logger, type LoggingContext } from "../utils/logging";

/**
 * Getter for an attestation request. The attestation request is a JWT that will be sent to the Wallet Provider to request a Wallet Instance Attestation.
 *
 * @param challenge - The nonce received from the Wallet Provider which is part of the signed clientData
 * @param wiaCryptoContext - The key pair associated with the WIA. Will be use to prove the ownership of the attestation
 * @param integrityContext - The integrity context which exposes a set of functions to interact with the device integrity service
 * @param walletProviderBaseUrl - Base url for the Wallet Provider
 * @returns A JWT containing the attestation request
 */
export async function getAttestationRequest(
  challenge: string,
  wiaCryptoContext: CryptoContext,
  integrityContext: IntegrityContext,
  walletProviderBaseUrl: string
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
      iss: keyThumbprint,
      sub: walletProviderBaseUrl,
      challenge,
      hardware_signature: signature,
      integrity_assertion: authenticatorData,
      hardware_key_tag: hardwareKeyTag,
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
    })
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "war+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
}

/**
 * Request a Wallet Instance Attestation (WIA) to the Wallet provider
 *
 * @param params.wiaCryptoContext The key pair associated with the WIA. Will be use to prove the ownership of the attestation.
 * @param params.appFetch (optional) Http client
 * @param walletProviderBaseUrl Base url for the Wallet Provider
 * @returns The retrieved Wallet Instance Attestation token
 * @throws {WalletProviderResponseError} with a specific code for more context
 */
export const getAttestation = async ({
  wiaCryptoContext,
  integrityContext,
  walletProviderBaseUrl,
  appFetch = fetch,
}: {
  wiaCryptoContext: CryptoContext;
  integrityContext: IntegrityContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
  loggingContext?: LoggingContext;
}): Promise<string> => {
  const api = getWalletProviderClient({
    walletProviderBaseUrl,
    appFetch,
  });

  // 1. Get nonce from backend
  const challenge = await api.get("/nonce").then((response) => response.nonce);
  Logger.log(
    DebugLevel.DEBUG,
    `Challenge ${challenge} obtained from ${walletProviderBaseUrl}`
  );

  // 2. Get a signed attestation request
  const signedAttestationRequest = await getAttestationRequest(
    challenge,
    wiaCryptoContext,
    integrityContext,
    walletProviderBaseUrl
  );
  Logger.log(
    DebugLevel.DEBUG,
    `Signed attestation request: ${signedAttestationRequest}`
  );

  // 3. Request WIA
  const { wallet_attestation: walletAttestation } = await api
    .post("/token", {
      body: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signedAttestationRequest,
      },
    })
    .then((result) => TokenResponse.parse(result))
    .catch(handleAttestationCreationError);

  Logger.log(
    DebugLevel.DEBUG,
    `Obtained wallet attestation ${walletAttestation}`
  );

  return walletAttestation;
};

const handleAttestationCreationError = (e: unknown) => {
  Logger.log(
    DebugLevel.ERROR,
    `An error occurred while calling /token endpoint: ${e}`
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
