import { JWT, thumbprint } from "@pagopa/io-react-native-jwt";
import { Platform } from "react-native";

import type { KeyAttestationSupportedApi } from "../api";

import { getWalletProviderClient } from "../../client";
import {
  assertLocalSigners,
  type KeyAttestationSigner,
} from "../../utils/crypto";
import { IoWalletError } from "../../utils/errors";
import { fixBase64EncodingOnKey, JWK } from "../../utils/jwk";
import { Logger, LogLevel } from "../../utils/logging";
import { KeyAttestationResponse } from "./types";

/**
 * Create a Key Attestation Request in JWT format for the provided key.
 * @param challenge The challenge for key attestation
 * @param signer The signer of the key to attest
 * @returns The key attestation request JWT, the public key and the original signer
 */
const createKeyAttestationRequest = async (
  challenge: string,
  signer: KeyAttestationSigner,
) => {
  const { attestation, success } =
    await signer.generateKeyWithAttestation(challenge);

  if (!success) {
    throw new IoWalletError(
      "generateKeyWithAttestation failed to generate a cryptographic key for the Key Attestation request",
    );
  }

  if (Platform.OS === "android" && !attestation) {
    throw new IoWalletError(
      "Missing Android key attestation: the generated key pair must be hardware-backed",
    );
  }

  const publicKey = JWK.parse(await signer.getPublicKey());

  const requestJwt = await new JWT(publicKey)
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "key-attestation-request+jwt",
    })
    .setPayload({
      cnf: {
        jwk: fixBase64EncodingOnKey(publicKey),
      },
      wscd_key_attestation: {
        storage_type: "LOCAL_NATIVE",
        ...(attestation && { attestation }),
      },
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign((v) => signer.sign(v));

  return { keyAttestationRequestJwt: requestJwt, publicKey, signer };
};

export const getAttestation: KeyAttestationSupportedApi["getAttestation"] =
  async (
    { walletProviderBaseUrl, walletSolutionId, walletSolutionVersion },
    { appFetch = fetch, integrityContext, keysToAttest: keysToAttestSigners },
  ) => {
    if (keysToAttestSigners.length === 0) {
      throw new IoWalletError("At least one key to attest must be provided");
    }

    assertLocalSigners("1.4.6", ...keysToAttestSigners);

    const api = getWalletProviderClient({ appFetch, walletProviderBaseUrl });

    const { nonce } = await api.get("/nonce");
    Logger.log(
      LogLevel.DEBUG,
      `Challenge obtained from ${walletProviderBaseUrl}: ${nonce}`,
    );

    const keysToAttest = await Promise.all(
      keysToAttestSigners.map((signer) =>
        createKeyAttestationRequest(nonce, signer),
      ),
    );

    // Use the first key to attest to sign the WUA Request JWT
    const signatureKey = keysToAttest.at(0);

    if (!signatureKey) {
      throw new IoWalletError(
        "No signature key available for signing the WUA request",
      );
    }

    const hardwareKeyTag = integrityContext.getHardwareKeyTag();

    const clientData = {
      challenge: nonce,
      jwk_thumbprints: await Promise.all(
        keysToAttest.map((k) => thumbprint(k.publicKey)),
      ),
    };

    const { authenticatorData, signature } =
      await integrityContext.getHardwareSignatureWithAuthData(
        JSON.stringify(clientData),
      );

    const signedAttestationRequest = await new JWT(signatureKey.publicKey)
      .setProtectedHeader({
        kid: signatureKey.publicKey.kid,
        typ: "wua-request+jwt",
      })
      .setPayload({
        cnf: {
          jwk: fixBase64EncodingOnKey(signatureKey.publicKey),
        },
        hardware_key_tag: hardwareKeyTag,
        hardware_signature: signature,
        integrity_assertion: authenticatorData,
        iss: hardwareKeyTag,
        keys_to_attest: keysToAttest.map((k) => k.keyAttestationRequestJwt),
        nonce,
        platform: Platform.OS,
        wallet_solution_id: walletSolutionId,
        wallet_solution_version: walletSolutionVersion,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign((v) => signatureKey.signer.sign(v));

    Logger.log(
      LogLevel.DEBUG,
      `Signed attestation request: ${signedAttestationRequest}`,
    );

    const response = await api
      .post("/key-attestations", {
        body: signedAttestationRequest,
        header: {
          "Content-Type": "text/plain",
        },
      })
      .then(KeyAttestationResponse.parse);

    Logger.log(
      LogLevel.DEBUG,
      `Obtained Key Attestation: ${response.key_attestation}`,
    );

    return {
      attestation: response.key_attestation,
      format: "jwt",
    };
  };
