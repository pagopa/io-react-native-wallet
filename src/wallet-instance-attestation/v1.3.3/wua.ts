import { Platform } from "react-native";
import { SignJWT } from "@pagopa/io-react-native-jwt";
import { Logger, LogLevel } from "../../utils/logging";
import { getWalletProviderClient } from "../../client";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { IoWalletError } from "../../utils/errors";
import type { AttestationCryptoContext } from "../../utils/crypto";
import type { WalletInstanceAttestationApi } from "../api";

/**
 * Create a Key Attestation Request in JWT format for the provided key.
 * @param challenge The challenge for key attestation
 * @param cryptoContext The crypto context of the key to attest
 * @returns The key attestation request JWT, the public key and the original crypto context
 */
const createKeyAttestationRequest = async (
  challenge: string,
  cryptoContext: AttestationCryptoContext
) => {
  const { attestation } =
    await cryptoContext.generateKeyWithAttestation(challenge);

  const publicKey = JWK.parse(await cryptoContext.getPublicKey());

  const requestJwt = await new SignJWT(cryptoContext)
    .setPayload({
      wscd_key_attestation: {
        storage_type: "LOCAL_NATIVE",
        ...(attestation && { attestation }),
      },
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
    })
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "key-attestation-request+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();

  return { cryptoContext, publicKey, keyAttestationRequestJwt: requestJwt };
};

export const getWalletUnitAttestation: WalletInstanceAttestationApi["getWalletUnitAttestation"] =
  async (
    { walletProviderBaseUrl, walletSolutionId, walletSolutionVersion },
    { attestationCryptoContexts, integrityContext, appFetch = fetch }
  ) => {
    if (attestationCryptoContexts.length === 0) {
      throw new IoWalletError("At least one key to attest must be provided");
    }

    const api = getWalletProviderClient({ walletProviderBaseUrl, appFetch });

    const { nonce } = await api.get("/nonce");
    Logger.log(
      LogLevel.DEBUG,
      `Challenge obtained from ${walletProviderBaseUrl}: ${nonce}`
    );

    const keysToAttest = await Promise.all(
      attestationCryptoContexts.map((cryptoContext) =>
        createKeyAttestationRequest(nonce, cryptoContext)
      )
    );

    // Use the first key to attest to sign the WUA Request JWT
    const signatureKey = keysToAttest.at(0)!;

    const hardwareKeyTag = integrityContext.getHardwareKeyTag();

    const clientData = {
      challenge: nonce,
      keys: keysToAttest.map((k) => k.publicKey),
    };

    const { signature, authenticatorData } =
      await integrityContext.getHardwareSignatureWithAuthData(
        JSON.stringify(clientData)
      );

    const wuaRequest = new SignJWT(signatureKey.cryptoContext)
      .setPayload({
        nonce,
        hardware_key_tag: hardwareKeyTag,
        iss: hardwareKeyTag,
        keys_to_attest: keysToAttest.map((k) => k.keyAttestationRequestJwt),
        hardware_signature: signature,
        integrity_assertion: authenticatorData,
        platform: Platform.OS,
        wallet_solution_id: walletSolutionId,
        wallet_solution_version: walletSolutionVersion,
        cnf: {
          jwk: fixBase64EncodingOnKey(signatureKey.publicKey),
        },
      })
      .setProtectedHeader({
        kid: signatureKey.publicKey.kid,
        typ: "wua-request+jwt",
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();

    return wuaRequest;
  };
