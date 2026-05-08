import { EncryptJwe, getJwkFromHeader } from "@pagopa/io-react-native-jwt";
import { verify } from "@pagopa/io-react-native-jwt";
import { type CallbackContext, type JwtSigner } from "@pagopa/io-wallet-oauth2";
import { digest } from "@sd-jwt/crypto-nodejs";
import { X509 } from "jsrsasign";
import { IoWalletError } from "./errors";
import { assert, generateRandomBytes } from "./misc";
import type { JWK } from "./jwk";
import { getJwkFromCertificateChain, getJwkFromTrustChain } from "./crypto";

type PartialCallbackContext = Omit<
  CallbackContext,
  "signJwt" | "clientAuthentication"
>;

// Fix incompatibility between ArrayBuffer types
type DigestFixed = (
  data: string | ArrayBuffer | ArrayBufferView,
  algorithm?: string
) => Uint8Array;

/**
 * Extract the signing JWK from one of the supported signer methods.
 * @param signer - The JWT signer.
 * @returns The JWK for signature verification.
 */
const getJwkFromSigner = async (signer: JwtSigner): Promise<JWK> => {
  switch (signer.method) {
    case "x5c":
      return getJwkFromCertificateChain(signer.x5c);
    case "federation": {
      assert(
        signer.trustChain && signer.trustChain.length > 0,
        "Trust chain is required for federation signer"
      );
      return getJwkFromTrustChain(signer.trustChain, signer.kid);
    }
    case "jwk":
      return signer.publicJwk as JWK;
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
  generateRandom: generateRandomBytes,
  hash: digest as DigestFixed,
  encryptJwe: async ({ publicJwk, alg, enc, kid }, data) => ({
    // @ts-expect-error `alg` and `enc` are strings, but EncryptJwe expects specific string literals
    jwe: await new EncryptJwe(data, { alg, enc, kid }).encrypt(publicJwk),
    encryptionJwk: publicJwk,
  }),
  verifyJwt: async (jwtSigner, jwt) => {
    try {
      const signerJwk = await getJwkFromSigner(jwtSigner);
      await verify(jwt.compact, signerJwk);
      return { verified: true, signerJwk };
    } catch {
      return { verified: false };
    }
  },
  decryptJwe: () => {
    throw new IoWalletError("decryptJwe is not implemented");
  },
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
  jwks: JWK[]
): CallbackContext["verifyJwt"] => {
  return async function verifyJwt(_, jwt) {
    try {
      const signerJwk = getJwkFromHeader(jwt.header as JWSHeader, jwks);
      await verify(jwt.compact, signerJwk);
      return { verified: true, signerJwk };
    } catch {
      return { verified: false };
    }
  };
};
