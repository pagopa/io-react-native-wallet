import {
  getPublicKey,
  sign,
  generate,
  deleteKey,
} from "@pagopa/io-react-native-crypto";
import uuid from "react-native-uuid";
import { thumbprint, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { fixBase64EncodingOnKey } from "./jwk";
import { X509, KEYUTIL, RSAKey, KJUR } from "jsrsasign";
import { JWK } from "./jwk";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";

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
      return getPublicKey(keytag)
        .then(fixBase64EncodingOnKey)
        .then(async (jwk) => ({
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
  const keytag = `ephemeral-${uuid.v4()}`;
  await generate(keytag);
  const ephemeralContext = createCryptoContextFor(keytag);
  return fn(ephemeralContext).finally(() => deleteKey(keytag));
};

/**
 * Converts a certificate string to PEM format.
 *
 * @param certificate - The certificate string.
 * @returns The PEM-formatted certificate.
 */
export const convertCertToPem = (certificate: string): string =>
  `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;

/**
 * Parses the public key from a PEM-formatted certificate.
 *
 * @param pemCert - The PEM-formatted certificate.
 * @returns The public key object.
 * @throws Will throw an error if the public key is unsupported.
 */
export const parsePublicKey = (
  pemCert: string
): RSAKey | KJUR.crypto.ECDSA | undefined => {
  const x509 = new X509();
  x509.readCertPEM(pemCert);
  const publicKey = x509.getPublicKey();

  if (publicKey instanceof RSAKey || publicKey instanceof KJUR.crypto.ECDSA) {
    return publicKey;
  }

  return undefined;
};

/**
 * Retrieves the signing JWK from the public key.
 *
 * @param publicKey - The public key object.
 * @returns The signing JWK.
 */
export const getSigningJwk = (publicKey: RSAKey | KJUR.crypto.ECDSA): JWK => ({
  ...JWK.parse(KEYUTIL.getJWKFromKey(publicKey)),
  use: "sig",
});
