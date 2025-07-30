import {
  deleteKey,
  generate,
  getPublicKeyFixed,
  sign,
} from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";
import { thumbprint, type CryptoContext } from "@pagopa/io-react-native-jwt";

/**
 * Create a CryptoContext bound to a key pair.
 * Key pair is supposed to exist already in the device's keychain.
 * It's identified by its unique keytag.
 *
 * @returns the crypto context
 */
export const createCryptoContextFor = (keytag: string): CryptoContext => {
  return {
    async getPublicKey() {
      return getPublicKeyFixed(keytag).then(async (jwk) => ({
        ...jwk,
        // Keys in the TEE are not stored with their KID, which is supposed to be assigned when they are included in JWK sets.
        // (that is, KID is not a propoerty of the key itself, but it's property used to identify a key in a set).
        // We assume the convention we use the thumbprint of the public key as KID, thus for easy development we decided to evaluate KID here
        // However the values is an arbitrary string that might be anything
        kid: await thumbprint(jwk),
      }));
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

/**
 * Executes the input function injecting an ephemeral crypto context.
 * An ephemeral crypto context is a context which is bound to a key
 * that is just created and is deleted after use.
 *
 * @param fn The procedure to be executed
 * @returns The returned value of the input procedure.
 */
export const withEphemeralKey = async <R>(
  fn: (ephemeralContext: CryptoContext) => Promise<R>
): Promise<R> => {
  // Use an ephemeral key to be destroyed after use
  const keytag = `ephemeral-${uuidv4()}`;
  await generate(keytag);
  const ephemeralContext = createCryptoContextFor(keytag);
  return fn(ephemeralContext).finally(() => deleteKey(keytag));
};
