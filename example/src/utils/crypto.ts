import {
  generate,
  deleteKey,
  type CryptoError,
} from "@pagopa/io-react-native-crypto";

/**
 * Key which is used to generate a wallet instance attestation crypto context.
 * This key is used in combination with {@link regenerateCryptoKey} and {@link createCryptoContextFor} to generate a new crypto key and its context and make sure to delete the existing one if it exists.
 */
export const WIA_KEYTAG = "WIA_KEYTAG";

/**
 * Key which is used to generate a DPoP crypto context.
 * This key is used in combination with {@link regenerateCryptoKey} and {@link createCryptoContextFor} to generate a new crypto key and its context and make sure to delete the existing one if it exists.
 */
export const DPOP_KEYTAG = "DPOP_KEYTAG";

/**
 * Regenerates a crypto key by deleting it if it exists and then generating a new one.
 * This function simply tries to delete it without checking if it exists first, ignoring the specific exception thrown in this case and then generates a new one.
 * @param keyTag - The key tag to be associated with the crypto key
 */
export const regenerateCryptoKey = async (keyTag: string) => {
  // Delete the key if it exists, otherwise ignore the error
  await deleteKeyIfExists(keyTag);
  await generate(keyTag);
};

/**
 * Deletes a crypto key without checking if it exists first, ignoring the specific exception thrown in this case.
 * It shadows the error thrown when the key is not found.
 * @param keyTag - The key tag to be associated with the crypto key
 */
export const deleteKeyIfExists = async (keyTag: string) => {
  await deleteKey(keyTag).catch((e) => {
    const { message } = e as CryptoError;
    if (message !== "PUBLIC_KEY_NOT_FOUND") throw e;
  });
};
