import base64decode from "../lib/base64";
import { WalletInstanceAttestationJwt } from "./types";

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
  const [header, payload] = token
    .split(".")
    .slice(0, 2)
    .map(base64decode)
    .map((e) => JSON.parse(e));
  // parse JWT to ensure it has the shape of a WalletInstanceAttestationJwt
  return WalletInstanceAttestationJwt.parse({
    header,
    payload,
  });
}

/**
 * Verify a given JWT to get the parsed Wallet Instance Attestation object they define.
 * Same as {@link decode} plus token signature verification
 *
 * @async @function
 *
 * @todo implement signature validation
 *
 * @param token The encoded token that represents a valid jwt
 * @param {} options
 *
 * @returns {WalletInstanceAttestationJwt} The validated Wallet Instance Attestation object
 * @throws A decoding error if the token doesn't resolve in a valid JWT
 * @throws A validation error if the provided data doesn't result in a valid Wallet Instance Attestation
 * @throws Invalid signature error if the token signature is not valid
 *
 */
export async function verify(
  token: string,
  _options: {} // eslint-disable-line @typescript-eslint/ban-types
): Promise<WalletInstanceAttestationJwt> {
  // TODO: signature validation

  // get decoded data
  // eslint-disable-next-line sonarjs/prefer-immediate-return
  const decoded = decode(token);

  // TODO: check disclosures in jwt

  return decoded;
}
