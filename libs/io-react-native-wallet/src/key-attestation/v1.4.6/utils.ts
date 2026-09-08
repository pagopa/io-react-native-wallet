import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";

import { KeyAttestationJwt } from "./types";

/**
 * Decode a given JWT to get the parsed Key Attestation object they define.
 * It ensures the provided data is in a valid shape, but it DOES NOT verify the signature.
 */
export function decode(token: string): KeyAttestationJwt {
  const decodedJwt = decodeJwt(token);
  return KeyAttestationJwt.parse({
    header: decodedJwt.protectedHeader,
    payload: decodedJwt.payload,
  });
}
