import { WalletInstanceAttestationJwt } from "./types";
import { decode, verify } from "@pagopa/io-react-native-jwt";

/**
 * Decode a given JWT to get the parsed Wallet Instance Attestation object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the JWT.
 * Use {@link verifyJwt} instead
 */
export function decodeJwt(token: string): WalletInstanceAttestationJwt {
  // decode JWT parts
  const decodedJwt = decode(token);
  // parse JWT to ensure it has the shape of a WalletInstanceAttestationJwt
  return WalletInstanceAttestationJwt.parse({
    header: decodedJwt.protectedHeader,
    payload: decodedJwt.payload,
  });
}

/**
 * Verify a given JWT to get the parsed Wallet Instance Attestation object they define.
 * Same as {@link decodeJwt} plus token signature verification
 */
export async function verifyJwt(
  token: string
): Promise<WalletInstanceAttestationJwt> {
  const decoded = decodeJwt(token);
  const pubKey = decoded.payload.cnf.jwk;

  await verify(token, pubKey);

  return decoded;
}
