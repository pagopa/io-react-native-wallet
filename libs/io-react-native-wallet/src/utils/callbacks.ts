import {
  type CryptoContext,
  EncryptJwe,
  getJwkFromHeader,
  SignJWT,
} from "@pagopa/io-react-native-jwt";
import { verify } from "@pagopa/io-react-native-jwt";
import { type CallbackContext, type JwtSigner } from "@pagopa/io-wallet-oauth2";
import { digest } from "@sd-jwt/crypto-nodejs";
import { X509 } from "jsrsasign";

import type { JWK } from "./jwk";

import { getJwkFromCertificateChain, getJwkFromTrustChain } from "./crypto";
import { IoWalletError } from "./errors";
import { assert, generateRandomBytes } from "./misc";

// Fix incompatibility between ArrayBuffer types
type DigestFixed = (
  data: ArrayBuffer | ArrayBufferView | string,
  algorithm?: string,
) => Uint8Array;

type PartialCallbackContext = Omit<
  CallbackContext,
  "clientAuthentication" | "signJwt"
>;

/**
 * Extract the signing JWK from one of the supported signer methods.
 * @param signer - The JWT signer.
 * @returns The JWK for signature verification.
 */
const getJwkFromSigner = async (signer: JwtSigner): Promise<JWK> => {
  switch (signer.method) {
    case "federation": {
      assert(
        signer.trustChain && signer.trustChain.length > 0,
        "Trust chain is required for federation signer",
      );
      return getJwkFromTrustChain(signer.trustChain, signer.kid);
    }
    case "jwk":
      return signer.publicJwk as JWK;
    case "x5c":
      return getJwkFromCertificateChain(signer.x5c);
    default:
      throw new IoWalletError(`Unsupported signer method: ${signer.method}`);
  }
};

/**
 * Shared callbacks with React Native implementations for use
 * in IO Wallet SDK. Callbacks not found here must be provided by the caller,
 * as they require parameters that depends on the use case.
 */
export const partialCallbacks: PartialCallbackContext = {
  decryptJwe: () => {
    throw new IoWalletError("decryptJwe is not implemented");
  },
  encryptJwe: async ({ alg, enc, kid, publicJwk }, data) => ({
    encryptionJwk: publicJwk,
    // @ts-expect-error `alg` and `enc` are strings, but EncryptJwe expects specific string literals
    jwe: await new EncryptJwe(data, { alg, enc, kid }).encrypt(publicJwk),
  }),
  generateRandom: generateRandomBytes,
  getX509CertificateMetadata: (certificate) => {
    const x509 = new X509();
    x509.readCertPEM(certificate);
    const sanExt = x509.getExtSubjectAltName(certificate);

    const sanDnsNames: string[] = [];
    const sanUriNames: string[] = [];

    for (const item of sanExt.array) {
      if (!item) continue;
      if ("dns" in item) sanDnsNames.push(item.dns);
      if ("uri" in item) sanUriNames.push(item.uri);
    }

    return { sanDnsNames, sanUriNames };
  },
  hash: digest as DigestFixed,
  verifyJwt: async (jwtSigner, jwt) => {
    try {
      const signerJwk = await getJwkFromSigner(jwtSigner);
      await verify(jwt.compact, signerJwk);
      return { signerJwk, verified: true };
    } catch {
      return { verified: false };
    }
  },
};

type JWSHeader = Parameters<typeof getJwkFromHeader>[0];

/**
 * Create a verifyJwt implementation that extracts the JWK for signature verification
 * from a list of keys, matching the `kid` in the JWT header.
 *
 * This function does not support other `JwtSigner` methods.
 *
 * @param jwks The list of available keys
 * @returns Function that implements `verifyJwt` callback
 */
export const createVerifyJwtFromJwks = (
  jwks: JWK[],
): CallbackContext["verifyJwt"] =>
  async function verifyJwt(_, jwt) {
    try {
      const signerJwk = getJwkFromHeader(jwt.header as JWSHeader, jwks);
      await verify(jwt.compact, signerJwk);
      return { signerJwk, verified: true };
    } catch {
      return { verified: false };
    }
  };

/**
 * Create a signJwt implementation that signs a JWT using the provided CryptoContext.
 * @param cryptoContext The CryptoContext to use for signing the JWT
 * @returns Function that implements `signJwt` callback
 */
export const createSignJwtFromCryptoContext = (
  cryptoContext: CryptoContext,
): CallbackContext["signJwt"] =>
  async function signJwt(jwtSigner, { header, payload }) {
    return {
      jwt: await new SignJWT(cryptoContext)
        .setProtectedHeader(header)
        .setPayload(payload)
        .sign(),
      signerJwk:
        jwtSigner.method === "jwk"
          ? jwtSigner.publicJwk
          : await cryptoContext.getPublicKey(),
    };
  };
