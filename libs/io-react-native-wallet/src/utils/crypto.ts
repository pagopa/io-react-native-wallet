import { type CryptoContext, decode } from "@pagopa/io-react-native-jwt";
import { KEYUTIL, KJUR, RSAKey, X509 } from "jsrsasign";

import type { BaseEntityConfiguration } from "../trust/common/types";

import { IoWalletError, UnimplementedFeatureError } from "./errors";
import { JWK, JWKS } from "./jwk";

/**
 * The JWK of an EC public key
 */
export interface ECPublicKey {
  crv: string;
  kty: "EC";
  x: string;
  y: string;
}

/**
 * The public key type. It could be either an EC or an RSA key.
 */
export type PublicKey = ECPublicKey | RSAPublicKey;

/**
 * The JWK of an RSA public key
 */
export interface RSAPublicKey {
  alg: string;
  e: string;
  kty: "RSA";
  n: string;
}

/**
 * A signer bound to a single key pair, provided by the consumer.
 * The consumer owns the whole lifecycle of the key (generation, persistence, deletion)
 * and decides where it lives (device keystore or remote HSM).
 * The library only reads the public key and asks for signatures.
 */
export interface Signer {
  /**
   * Get the public key of the key pair.
   * The returned JWK is expected to include the `kid`, conventionally the key thumbprint.
   */
  getPublicKey: () => Promise<JWK>;

  /**
   * Where the key lives: the device keystore (`LOCAL`) or a remote HSM (`REMOTE`).
   * Flows that do not support remote keys throw an {@link UnimplementedFeatureError}.
   */
  kind: SignerKind;

  /**
   * Sign multiple values with the private key in a single operation (e.g. a single remote HSM call).
   * When not implemented, the library signs each value with {@link Signer.sign}.
   * @param values The values to sign, provided as is like in {@link Signer.sign}
   * @returns The signatures, in the same order as the values
   */
  multisign?: (values: string[]) => Promise<string[]>;

  /**
   * Sign a value with the private key.
   * The value is provided as is: any transformation (e.g. hashing) is up to the implementation.
   * @param value The value to sign
   * @returns The signature: DER encoded for EC keys, base64 for RSA keys.
   */
  sign: (value: string) => Promise<string>;
}

/**
 * Where the key of a {@link Signer} lives.
 */
export type SignerKind = "LOCAL" | "REMOTE";

/**
 * Adapt a {@link Signer} to the {@link CryptoContext} expected by `SignJWT`.
 * @param signer The signer to adapt
 * @returns The crypto context
 */
export const toCryptoContext = (signer: Signer): CryptoContext => ({
  getPublicKey: () => signer.getPublicKey(),
  getSignature: (value: string) => signer.sign(value),
});

/**
 * Ensure that none of the given signers is bound to a remote key.
 * @param version The version of the flow that does not support remote keys
 * @param signers The signers to check
 * @throws {UnimplementedFeatureError} If any signer is remote
 */
export const assertLocalSigners = (version: string, ...signers: Signer[]) => {
  if (signers.some((signer) => signer.kind === "REMOTE")) {
    throw new UnimplementedFeatureError("remote WSCD", version);
  }
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
    "Unable to find the signing key inside the PEM certificate",
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
  certChain: string[],
): Promise<JWK> => {
  const [leafCert] = certChain;
  if (!leafCert) {
    throw new IoWalletError(
      "The provided certificate chain is invalid or malformed",
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
  signerKid: string,
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
      baseEntityConfig.metadata as Record<string, { jwks?: JWKS }>,
    )) {
      if (metadata.jwks) {
        keys.push(...JWKS.parse(metadata.jwks).keys);
      }
    }
  }

  const federationJwk = keys.find((key) => key.kid === signerKid);
  if (!federationJwk)
    throw new IoWalletError(
      "No suitable key was found in the provided trust chain",
    );
  return federationJwk;
};
