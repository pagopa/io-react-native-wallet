import {
  deleteKey,
  generate,
  getPublicKeyFixed,
  sign,
} from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";
import {
  decode,
  thumbprint,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";
import type { BaseEntityConfiguration } from "../trust/common/types";
import { JWK, JWKS } from "./jwk";
import { KEYUTIL, KJUR, RSAKey, X509 } from "jsrsasign";
import { IoWalletError } from "./errors";

/**
 * Extension of the {@link CryptoContext} that adds key generation with optional key attestation.
 *
 * This context requires the consumer to provide an additional method for **key generation**;
 * on Android this method should also generate a key attestation as a certificate chain
 * to ensure the key pair is hardware-backed.
 */
export type KeyAttestationCryptoContext = CryptoContext & {
  /**
   * Generate a key pair with an **optional key attestation** (Android).
   * @param challenge The challenge for the key attestation.
   * @returns An object with a success flag and a key attestation, if it was generated.
   */
  generateKeyWithAttestation(
    challenge: string
  ): Promise<{ success: boolean; attestation?: string }>;
};

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
 * Retrieves the signing JWK from a x509 certificate chain.
 *
 * @param certChain - The x509 certificate chain.
 * @returns The signing JWK.
 * @throws Will throw an error if no suitable keys are found.
 */
export const getJwkFromCertificateChain = async (
  certChain: string[]
): Promise<JWK> => {
  const [leafCert] = certChain;
  if (!leafCert) {
    throw new IoWalletError(
      "The provided certificate chain is invalid or malformed"
    );
  }
  const pemCert = convertBase64DerToPem(leafCert);
  return getSigninJwkFromCert(pemCert);
};

/**
 * Retrieves the signing JWK from a trust chain of entity configuration JWTs, matching the provided signer KID.
 *
 * @param trustChain - The trust chain of entity configuration JWTs.
 * @param signerKid - The KID of the signer to look for in the trust chain.
 * @returns The signing JWK.
 * @throws Will throw an error if no suitable keys are found.
 */
export const getJwkFromTrustChain = (
  trustChain: string[],
  signerKid: string
): JWK => {
  const [entityConfigurationJwt] = trustChain;
  if (!entityConfigurationJwt) {
    throw new IoWalletError("The provided trust chain is invalid or malformed");
  }

  const keys: JWK[] = [];
  const decodedEntityConfigJwt = decode(entityConfigurationJwt);
  const baseEntityConfig =
    decodedEntityConfigJwt.payload as BaseEntityConfiguration["payload"];

  // Get top-level JWKS
  if (baseEntityConfig.jwks) {
    keys.push(...JWKS.parse(baseEntityConfig.jwks).keys);
  }

  // Check metadata entries for additional JWKS like openid_credential_verifier
  if (baseEntityConfig.metadata) {
    for (const metadata of Object.values(
      baseEntityConfig.metadata as Record<string, { jwks?: JWKS }>
    )) {
      if (metadata.jwks) {
        keys.push(...JWKS.parse(metadata.jwks).keys);
      }
    }
  }

  const federationJwk = keys.find((key) => key.kid === signerKid);
  if (!federationJwk)
    throw new IoWalletError(
      "No suitable key was found in the provided trust chain"
    );
  return federationJwk;
};
