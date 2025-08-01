import {
  deleteKey,
  generate,
  getPublicKeyFixed,
  sign,
  type PublicKey,
} from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";
import { thumbprint, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { JWK } from "./jwk";
import { KEYUTIL, KJUR, RSAKey, X509 } from "jsrsasign";
import { IoWalletError } from "./errors";

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
/**
 * Converts a base64-encoded DER certificate to PEM format.
 *
 * @param certificate - The base64-encoded DER certificate.
 * @returns The PEM-formatted certificate.
 */
export const convertBase64DerToPem = (certificate: string): string =>
  `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;

/**
 * Retrieves the signing JWK from a PEM-formatted certificate.
 *
 * @param pemCert - The PEM-formatted certificate.
 * @returns The signing JWK.
 * @throws Will throw an error if the public key is unsupported.
 */
export const getSigninJwkFromCert = (pemCert: string): JWK => {
  const x509 = new X509();
  x509.readCertPEM(pemCert);
  const publicKey = x509.getPublicKey();

  console.log("INSTANCE OF RSA", publicKey instanceof RSAKey);
  console.log("INSTANCE OF ECDSA", publicKey instanceof KJUR.crypto.ECDSA);

  if (publicKey instanceof RSAKey || publicKey instanceof KJUR.crypto.ECDSA) {
    return {
      ...JWK.parse(KEYUTIL.getJWKFromKey(publicKey)),
      use: "sig",
    };
  }

  throw new IoWalletError(
    "Unable to find the signing key inside the PEM certificate"
  );
};

/**
 * This function takes two {@link PublicKey} and evaluates and compares their thumbprints
 * @param key1 The first key
 * @param key2 The second key
 * @returns true if the keys' thumbprints are equal, false otherwise
 */
export const compareKeysByThumbprint = async (
  key1: PublicKey,
  key2: PublicKey
) => {
  //Parallel for optimization
  const [thumbprint1, thumbprint2] = await Promise.all([
    thumbprint(key1),
    thumbprint(key2),
  ]);
  return thumbprint1 === thumbprint2;
};
