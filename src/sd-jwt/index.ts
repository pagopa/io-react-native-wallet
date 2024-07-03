import { z } from "zod";

import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { verify as verifyJwt } from "@pagopa/io-react-native-jwt";
import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";

import { decodeBase64 } from "@pagopa/io-react-native-jwt";
import { Disclosure, SdJwt4VC, type DisclosureWithEncoded } from "./types";
import { verifyDisclosure } from "./verifier";
import type { JWK } from "../utils/jwk";
import {
  ClaimsNotFoundBetweenDislosures,
  ClaimsNotFoundInToken,
} from "../utils/errors";

const decodeDisclosure = (encoded: string): DisclosureWithEncoded => {
  const decoded = Disclosure.parse(JSON.parse(decodeBase64(encoded)));
  return { decoded, encoded };
};

/**
 * Decode a given SD-JWT with Disclosures to get the parsed SD-JWT object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the SD-JWT.
 * Use {@link verify} instead
 *
 * @function
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 * @param customSchema (optional) Schema to use to parse the SD-JWT. Default: SdJwt4VC
 *
 * @returns The parsed SD-JWT token and the parsed disclosures
 *
 */
export const decode = <S extends z.ZodType<SdJwt4VC>>(
  token: string,
  customSchema?: S
): {
  sdJwt: z.infer<S>;
  disclosures: DisclosureWithEncoded[];
} => {
  // token are expected in the form "sd-jwt~disclosure0~disclosure1~...~disclosureN~"
  if (token.slice(-1) === "~") {
    token = token.slice(0, -1);
  }
  const [rawSdJwt = "", ...rawDisclosures] = token.split("~");

  // get the sd-jwt as object
  // validate it's a valid SD-JWT for Verifiable Credentials
  const decodedJwt = decodeJwt(rawSdJwt);

  // use a custom parsed if provided, otherwise use base SdJwt4VC
  const parser = customSchema || SdJwt4VC;

  const sdJwt = parser.parse({
    header: decodedJwt.protectedHeader,
    payload: decodedJwt.payload,
  });

  // get disclosures as list of triples
  // validate each triple
  // throw a validation error if at least one fails to parse
  const disclosures = rawDisclosures.map(decodeDisclosure);

  return { sdJwt, disclosures };
};

/**
 * Select disclosures from a given SD-JWT with Disclosures.
 * Claims relate with disclosures by their name.
 *
 * @function
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 * @param claims The list of claims to be disclosed
 *
 * @throws {ClaimsNotFoundBetweenDislosures} When one or more claims does not relate to any discloure.
 * @throws {ClaimsNotFoundInToken} When one or more claims are not contained in the SD-JWT token.
 * @returns The encoded token with only the requested disclosures, along with the path each claim can be found on the SD-JWT token
 *
 */
export const disclose = async (
  token: string,
  claims: string[]
): Promise<{ token: string; paths: { claim: string; path: string }[] }> => {
  const [rawSdJwt, ...rawDisclosures] = token.split("~");
  const { sdJwt, disclosures } = decode(token, SdJwt4VC);

  // for each claim, return the path on which they are located in the SD-JWT token
  const paths = await Promise.all(
    claims.map(async (claim) => {
      const disclosure = disclosures.find(
        ({ decoded: [, name] }) => name === claim
      );

      // check every claim represents a known disclosure
      if (!disclosure) {
        throw new ClaimsNotFoundBetweenDislosures(claim);
      }

      const hash = await sha256ToBase64(disclosure.encoded);

      // _sd is defined in verified_claims.claims and verified_claims.verification
      // we must look into both
      if (sdJwt.payload._sd.includes(hash)) {
        const index = sdJwt.payload._sd.indexOf(hash);
        return { claim, path: `verified_claims.claims._sd[${index}]` };
      }

      throw new ClaimsNotFoundInToken(claim);
    })
  );

  const filteredDisclosures = rawDisclosures.filter((d) => {
    const {
      decoded: [, name],
    } = decodeDisclosure(d);
    return claims.includes(name);
  });

  // compose the final disclosed token
  const disclosedToken = [rawSdJwt, ...filteredDisclosures].join("~");

  return { token: disclosedToken, paths };
};

/**
 * Verify a given SD-JWT with Disclosures
 * Same as {@link decode} plus:
 *   - token signature verification
 *   - ensure disclosures are well-defined inside the SD-JWT
 *
 * @async @function
 *
 *
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 * @param publicKey The single public key or an array of public keys to validate the signature.
 * @param customSchema Schema to use to parse the SD-JWT
 *
 * @returns The parsed SD-JWT token and the parsed disclosures
 *
 */
export const verify = async <S extends z.ZodType<SdJwt4VC>>(
  token: string,
  publicKey: JWK | JWK[],
  customSchema?: S
): Promise<{ sdJwt: z.infer<S>; disclosures: Disclosure[] }> => {
  // get decoded data
  const [rawSdJwt = ""] = token.split("~");
  const decoded = decode(token, customSchema);

  //Check signature
  await verifyJwt(rawSdJwt, publicKey);

  //Check disclosures in sd-jwt
  const claims = [...decoded.sdJwt.payload._sd];

  await Promise.all(
    decoded.disclosures.map(
      async (disclosure) => await verifyDisclosure(disclosure, claims)
    )
  );

  return {
    sdJwt: decoded.sdJwt,
    disclosures: decoded.disclosures.map((d) => d.decoded),
  };
};

export { SdJwt4VC };
