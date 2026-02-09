import { WalletInstanceAttestationJwt } from "./types";
import {
  decode as decodeJwt,
  verify as verifyJwt,
} from "@pagopa/io-react-native-jwt";

/**
 * Decode a given JWT to get the parsed Wallet Instance Attestation object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the JWT.
 * Use {@link verify} instead
 */
export function decode(token: string): WalletInstanceAttestationJwt {
  // decode JWT parts
  const decodedJwt = decodeJwt(token);
  // parse JWT to ensure it has the shape of a WalletInstanceAttestationJwt
  return WalletInstanceAttestationJwt.parse({
    header: decodedJwt.protectedHeader,
    payload: decodedJwt.payload,
  });
}

/**
 * Verify a given JWT to get the parsed Wallet Instance Attestation object they define.
 * Same as {@link decode} plus token signature verification
 */
export async function verify(
  token: string
): Promise<WalletInstanceAttestationJwt> {
  const decoded = decode(token);
  const pubKey = decoded.payload.cnf.jwk;

  await verifyJwt(token, pubKey);

  return decoded;
}
