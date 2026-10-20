import type {
  CborDecoder,
  CborVerifier,
} from "@io-app-it-wallet/io-react-native-wallet";

import { CBOR, COSE } from "@pagopa/io-react-native-iso18013";

/**
 * CBOR decoder backed by the native ISO 18013 module.
 */
export const cborDecoder: CborDecoder = {
  decode: CBOR.decode,
  decodeIssuerSigned: CBOR.decodeIssuerSigned,
};

/**
 * COSE-Sign1 verifier backed by the native ISO 18013 module.
 */
export const cborVerifier: CborVerifier = (coseSign1, publicKey) =>
  COSE.verify(coseSign1, publicKey as Parameters<typeof COSE.verify>[1]);
