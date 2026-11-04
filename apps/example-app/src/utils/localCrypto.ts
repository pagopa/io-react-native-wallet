import type {
  RemotePresentation,
  Signer,
} from "@io-app-it-wallet/io-react-native-wallet";

import {
  type CryptoError,
  deleteKey,
  generate,
  getPublicKeyFixed,
  sign,
} from "@pagopa/io-react-native-crypto";
import { ISO18013_7 } from "@pagopa/io-react-native-iso18013";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";

/**
 * Key which is used to generate a wallet instance attestation signer.
 * This key is used in combination with {@link regenerateLocalCryptoKey} and {@link createLocalSignerFor} to generate a new crypto key and its context and make sure to delete the existing one if it exists.
 */
export const WIA_KEYTAG = "WIA_KEYTAG";

/**
 * Key which is used to generate a DPoP signer.
 * This key is used in combination with {@link regenerateLocalCryptoKey} and {@link createLocalSignerFor} to generate a new crypto key and its context and make sure to delete the existing one if it exists.
 */
export const DPOP_KEYTAG = "DPOP_KEYTAG";

/**
 * Regenerates a crypto key by deleting it if it exists and then generating a new one.
 * This function simply tries to delete it without checking if it exists first, ignoring the specific exception thrown in this case and then generates a new one.
 * @param keyTag - The key tag to be associated with the crypto key
 */
export const regenerateLocalCryptoKey = async (keyTag: string) => {
  // Delete the key if it exists, otherwise ignore the error
  await deleteLocalKeyIfExists(keyTag);
  await generate(keyTag);
};

/**
 * Deletes a crypto key without checking if it exists first, ignoring the specific exception thrown in this case.
 * It shadows the error thrown when the key is not found.
 * @param keyTag - The key tag to be associated with the crypto key
 */
export const deleteLocalKeyIfExists = async (keyTag: string) => {
  await deleteKey(keyTag).catch((e) => {
    const { message } = e as CryptoError;
    if (message !== "PUBLIC_KEY_NOT_FOUND") throw e;
  });
};

/**
 * Create a local {@link Signer} bound to a key pair stored in the device's keystore.
 * The key pair is supposed to exist already, it's identified by its unique keytag.
 *
 * @param keytag The keytag of the key pair
 * @returns the signer
 */
/**
 * A local {@link Signer} that also exposes the alias of its key, needed by native implementations that sign by alias.
 */
export type LocalKeySigner = Signer & { keyTag: string };

export const createLocalSignerFor = (keytag: string): LocalKeySigner => ({
  async getPublicKey() {
    return getPublicKeyFixed(keytag).then(async (jwk) => ({
      ...jwk,
      // Keys in the TEE are not stored with their KID, which is supposed to be assigned when they are included in JWK sets.
      // We assume the convention of using the thumbprint of the public key as KID.
      kid: await thumbprint(jwk),
    }));
  },
  keyTag: keytag,
  kind: "LOCAL",
  async sign(value: string) {
    return sign(value, keytag);
  },
});

/**
 * Executes the input function injecting an ephemeral local signer.
 * An ephemeral signer is bound to a key that is just created and is deleted after use.
 *
 * @param fn The procedure to be executed
 * @returns The returned value of the input procedure.
 */
export const withLocalEphemeralKey = async <R>(
  fn: (ephemeralSigner: Signer) => Promise<R>,
): Promise<R> => {
  const keytag = `ephemeral-${uuidv4()}`;
  await generate(keytag);
  const ephemeralSigner = createLocalSignerFor(keytag);
  return fn(ephemeralSigner).finally(() => deleteKey(keytag));
};

export { verifyCertificateChain as localCertificateChainVerifier } from "@pagopa/io-react-native-crypto";

/**
 * Generates the mdoc DeviceResponse through the native ISO 18013-7 module, which signs by key alias.
 * It only supports signers created with {@link createLocalSignerFor}.
 * TODO: replace it with an implementation that signs through `Signer.sign` to support remote signers.
 */
export const localMdocDeviceResponseGenerator: RemotePresentation.MdocDeviceResponseGenerator =
  async ({
    clientId,
    docType,
    generatedNonce,
    issuerSignedContent,
    presentationFrame,
    requestNonce,
    responseUri,
    signer,
  }) => {
    if (signer.kind !== "LOCAL" || !("keyTag" in signer)) {
      throw new Error("mdoc presentation is supported only with local signers");
    }
    return ISO18013_7.generateOID4VPDeviceResponse(
      clientId,
      responseUri,
      requestNonce,
      generatedNonce,
      [
        {
          alias: (signer as LocalKeySigner).keyTag,
          docType,
          issuerSignedContent,
        },
      ],
      presentationFrame as ISO18013_7.AcceptedFields,
    );
  };
