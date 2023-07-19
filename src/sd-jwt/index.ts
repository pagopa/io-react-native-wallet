import { z } from "zod";

import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { verify as verifyJwt } from "@pagopa/io-react-native-jwt";

import { decodeBase64 } from "@pagopa/io-react-native-jwt";
import { Disclosure } from "./types";
import { verifyDisclosure } from "./verifier";
import type { JWK } from "src/utils/jwk";

/**
 * Decode a given SD-JWT with Disclosures to get the parsed SD-JWT object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the SD-JWT.
 * Use {@link verify} instead
 *
 * @function
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 * @param schema Schema to use to parse the SD-JWT
 *
 * @returns The parsed SD-JWT token and the parsed disclosures
 *
 */
export const decode = <S extends z.AnyZodObject>(
  token: string,
  schema: S
): { sdJwt: z.infer<S>; disclosures: Disclosure[] } => {
  // token are expected in the form "sd-jwt~disclosure0~disclosure1~...~disclosureN"
  const [rawSdJwt = "", ...rawDisclosures] = token.split("~");

  // get the sd-jwt as object
  // validate it's a valid SD-JWT for Verifiable Credentials
  const decodedJwt = decodeJwt(rawSdJwt);
  const sdJwt = schema.parse({
    header: decodedJwt.protectedHeader,
    payload: decodedJwt.payload,
  });

  // get disclosures as list of triples
  // validate each triple
  // throw a validation error if at least one fails to parse
  const disclosures = rawDisclosures
    .map(decodeBase64)
    .map((e) => JSON.parse(e))
    .map((e) => Disclosure.parse(e));

  return { sdJwt, disclosures };
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
 * @param publicKey The public key to validate the signature
 * @param schema Schema to use to parse the SD-JWT
 *
 * @returns The parsed SD-JWT token and the parsed disclosures
 *
 */
export const verify = async <S extends z.AnyZodObject>(
  token: string,
  publicKey: JWK,
  schema: S
): Promise<{ sdJwt: z.infer<S>; disclosures: Disclosure[] }> => {
  // get decoded data
  const [rawSdJwt = ""] = token.split("~");
  const decoded = decode(token, schema);

  //Check signature
  await verifyJwt(rawSdJwt, publicKey);

  //Check disclosures in sd-jwt
  const claims = [
    ...decoded.sdJwt.payload.verified_claims.verification._sd,
    ...decoded.sdJwt.payload.verified_claims.claims._sd,
  ];

  await Promise.all(
    decoded.disclosures.map(
      async (disclosure) => await verifyDisclosure(disclosure, claims)
    )
  );

  return decoded;
};