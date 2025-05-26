import { WalletInstanceAttestationJwt } from "./types";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { verify as verifyJwt } from "@pagopa/io-react-native-jwt";

import { getAttestation } from "./issuing";
import { deprecatedGetAttestation } from "./issuing.deprecated";
export { getAttestation, deprecatedGetAttestation };

/**
 * Decode a given JWT to get the parsed Wallet Instance Attestation object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the JWT.
 * Use {@link verify} instead
 *
 * @function
 * @param token The encoded token that represents a valid jwt for Wallet Instance Attestation
 *
 * @returns The validated Wallet Instance Attestation object
 * @throws A decoding error if the token doesn't resolve in a valid JWT
 * @throws A validation error if the provided data doesn't result in a valid Wallet Instance Attestation
 *
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
 *
 * @async @function
 *
 *
 * @param token The encoded token that represents a valid jwt
 *
 * @returns {WalletInstanceAttestationJwt} The validated Wallet Instance Attestation object
 * @throws A decoding error if the token doesn't resolve in a valid JWT
 * @throws A validation error if the provided data doesn't result in a valid Wallet Instance Attestation
 * @throws Invalid signature error if the token signature is not valid
 *
 */
export async function verify(
  token: string
): Promise<WalletInstanceAttestationJwt> {
  const decoded = decode(token);
  const pubKey = decoded.payload.cnf.jwk;

  await verifyJwt(token, pubKey);

  return decoded;
}
