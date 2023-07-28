import { decode as decodeJwt, verify as verifyJwt } from "../../sd-jwt";
import { PID } from "./types";
import { pidFromToken } from "./converters";
import { Disclosure, SdJwt4VC } from "../../sd-jwt/types";

/**
 * Decode a given SD-JWT with Disclosures to get the parsed PID object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the SD-JWT.
 * Use {@link verify} instead
 *
 * @function
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 *
 * @returns The validated PID object along with the parsed SD-JWT token and the parsed disclosures
 * @throws A decoding error if the token doesn't resolve in a valid SD-JWT
 * @throws A validation error if the provided data doesn't result in a valid PID
 *
 */
export function decode(token: string): PidWithToken {
  let { sdJwt, disclosures } = decodeJwt(token, SdJwt4VC);
  const pid = pidFromToken(sdJwt, disclosures);

  return { pid, sdJwt, disclosures };
}

/**
 * Verify a given SD-JWT with Disclosures to get the parsed PID object they define.
 * Same as {@link decode} plus:
 *   - token signature verification
 *   - ensure disclosures are well-defined inside the SD-JWT
 *
 * @async @function
 *
 * @todo implement signature validation
 * @todo check disclosures in sd-jwt
 *
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 *
 * @returns {VerifyResult} The validated PID object along with the parsed SD-JWT token and the parsed disclosures
 * @throws A decoding error if the token doesn't resolve in a valid SD-JWT
 * @throws A validation error if the provided data doesn't result in a valid PID
 * @throws A validation error if the provided disclosures are not defined in the SD-JWT
 * @throws Invalid signature error if the token signature is not valid
 *
 */
export async function verify(token: string): Promise<VerifyResult> {
  const decoded = decode(token);
  const publicKey = decoded.sdJwt.payload.cnf.jwk;
  await verifyJwt(token, publicKey, SdJwt4VC);

  return decoded;
}

export type PidWithToken = {
  // The object with the parsed data for PID
  pid: PID;
  // The object with the parsed SD-JWT token that shipped the PID. It will be needed to present PID data.
  sdJwt: SdJwt4VC;
  // Parsed list of discloures with PID values. It will be needed to present PID data.
  disclosures: Disclosure[];
};

/**
 * Result object for {@link verify}
 */
export type VerifyResult = PidWithToken;

export { PID } from "./types";
