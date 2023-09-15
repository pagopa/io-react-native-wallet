import { getPublicKey, sign } from "@pagopa/io-react-native-crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

/**
 * Create a CryptoContext bound to a key pair.
 * Key pair is supposed to exist already in the device's keychain.
 * It's identified by its unique keytag.
 *
 * @returns the crypto context
 */
export const createCryptoContextFor = (keytag: string): CryptoContext => {
  return {
    /**
     * Retrieve the public key of the pair.
     * If the key pair doesn't exist yet, an error is raised
     * @returns The public key.
     */
    async getPublicKey() {
      return getPublicKey(keytag);
    },
    /**
     * Get a signature for a provided value.
     * If the key pair doesn't exist yet, an error is raised.
     * @param value
     * @returns The signature for the value
     */
    async getSignature(value: string) {
      return sign(value, keytag);
    },
  };
};
