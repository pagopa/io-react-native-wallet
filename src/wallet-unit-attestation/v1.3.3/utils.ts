import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { WalletUnitAttestationJwt } from "./types";

/**
 * Decode a given JWT to get the parsed Wallet Unit Attestation object they define.
 * It ensures the provided data is in a valid shape, but it DOES NOT verify the signature.
 */
export function decode(token: string): WalletUnitAttestationJwt {
  const decodedJwt = decodeJwt(token);
  return WalletUnitAttestationJwt.parse({
    header: decodedJwt.protectedHeader,
    payload: decodedJwt.payload,
  });
}
