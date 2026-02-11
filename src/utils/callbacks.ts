import { EncryptJwe } from "@pagopa/io-react-native-jwt";
import { verify } from "@pagopa/io-react-native-jwt";
import { type CallbackContext } from "@pagopa/io-wallet-oauth2";
import { digest } from "@sd-jwt/crypto-nodejs";
import { X509 } from "jsrsasign";
import QuickCrypto from "react-native-quick-crypto";

type PartialCallbackContext = Omit<
  CallbackContext,
  "signJwt" | "clientAuthentication"
>;

/**
 * Shared callbacks with React Native implementations for use
 * in IO Wallet SDK. Callbacks not found here must be provided by the caller,
 * as they require parameters that depends on the use case.
 */
export const partialCallbacks: PartialCallbackContext = {
  generateRandom: QuickCrypto.randomBytes,
  hash: digest,
  encryptJwe: async ({ publicJwk, alg, enc, kid }, data) => ({
    // @ts-expect-error `alg` and `enc` are strings, but EncryptJwe expects specific string literals
    jwe: await new EncryptJwe(data, { alg, enc, kid }).encrypt(publicJwk),
    encryptionJwk: publicJwk,
  }),
  verifyJwt: async (jwtSigner, jwt) => {
    // TODO: support other signing methods if needed
    if (jwtSigner.method !== "jwk") {
      throw new Error(`Unsupported signer method: ${jwtSigner.method}`);
    }
    try {
      await verify(jwt.compact, jwtSigner.publicJwk);
      return { verified: true, signerJwk: jwtSigner.publicJwk };
    } catch {
      return { verified: false };
    }
  },
  decryptJwe: () => {
    throw new Error("decryptJwe is not implented");
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
