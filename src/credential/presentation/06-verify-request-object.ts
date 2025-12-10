import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { Buffer } from "buffer";
import { InvalidRequestObjectError } from "./errors";
import { RequestObject } from "./types";
import { type FetchJwks } from "./05-retrieve-rp-jwks";
import type { Out } from "../../utils/misc";
import { Logger, LogLevel } from "../../utils/logging";
import { sha256ToBase64UrlFromBinary } from "../../utils/crypto";

export type VerifyRequestObject = (
  requestObjectEncodedJwt: string,
  jwkKeys: Out<FetchJwks>["keys"],
  optionalParams?: Partial<{
    state: string;
    rpSubject: string;
    x509Hash: string;
  }>
) => Promise<{ requestObject: RequestObject }>;

/**
 * Function to verify the Request Object's validity, from the signature to the required properties.
 * @param requestObjectEncodedJwt The Request Object in JWT format
 * @param jwkKeys The JWKS to use for signature validation
 * @param optionalParams.rpSubject Optional Verifier's sub from Entity Configuration
 * @param optionalParams.state Optional state
 * @returns The verified Request Object
 * @throws {InvalidRequestObjectError} if the Request Object cannot be validated
 */
export const verifyRequestObject: VerifyRequestObject = async (
  requestObjectEncodedJwt,
  jwkKeys,
  optionalParams = {}
) => {
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);

  // verify token signature to ensure the request object is authentic
  const pubKey =
    jwkKeys.find(({ kid }) => kid === requestObjectJwt.protectedHeader.kid) ||
    jwkKeys.find(({ use }) => use === "sig");

  if (!pubKey) {
    console.log("pubKey not found for Request Object verification", pubKey);
    throw new InvalidRequestObjectError(
      "The Request Object signature verification failed"
    );
  }

  try {
    // Standard claims are verified within `verify`
    await verify(requestObjectEncodedJwt, pubKey);
  } catch (e) {
    console.log("TEST CHIAVE NON VALIDA", e);
    throw new InvalidRequestObjectError(
      "The Request Object signature verification failed"
    );
  }

  const requestObject = validateRequestObjectShape(requestObjectJwt.payload);

  const { state, rpSubject, x509Hash } = optionalParams;

  if (state) {
    validateState(requestObject, state);
  }
  if (rpSubject) {
    validateSubject(requestObject, rpSubject);
  }
  if (x509Hash) {
    validateX509Hash(requestObjectJwt.protectedHeader.x5c, x509Hash);
  }

  Logger.log(
    LogLevel.DEBUG,
    "Verified Request Object: " + JSON.stringify(requestObject)
  );

  return { requestObject };
};

/**
 * Validate the shape of the Request Object to ensure all required properties are present and are of the expected type.
 *
 * @param payload The Request Object to validate
 * @returns A valid Request Object
 * @throws {InvalidRequestObjectError} when the Request Object cannot be parsed
 */
const validateRequestObjectShape = (payload: unknown): RequestObject => {
  const requestObjectParse = RequestObject.safeParse(payload);

  if (requestObjectParse.success) {
    return requestObjectParse.data;
  }

  throw new InvalidRequestObjectError(
    "The Request Object cannot be parsed successfully",
    formatFlattenedZodErrors(requestObjectParse.error.flatten())
  );
};

const validateSubject = (requestObject: RequestObject, sub: string) => {
  if (requestObject.client_id !== sub) {
    throw new InvalidRequestObjectError(
      "Client ID does not match Request Object or Entity Configuration"
    );
  }
};

const validateState = (requestObject: RequestObject, state: string) => {
  if (requestObject.state !== state) {
    throw new InvalidRequestObjectError(
      "The provided state does not match the Request Object's"
    );
  }
};

const validateX509Hash = (certChain: string[] | undefined, hash: string) => {
  if (!certChain) {
    throw new InvalidRequestObjectError("Missing x5c certificate chain");
  }
  // TODO: get the leaf certificate properly
  const cert = Buffer.from(certChain[0]!, "base64");
  const calculatedHash = sha256ToBase64UrlFromBinary(cert);
  if (hash !== calculatedHash) {
    throw new InvalidRequestObjectError(
      "x509_hash does not match the hash of the x5c leaf certificate"
    );
  }
};

/**
 * Utility to format flattened Zod errors into a simplified string `key1: key1_error, key2: key2_error`
 */
const formatFlattenedZodErrors = (
  errors: Zod.typeToFlattenedError<RequestObject>
): string =>
  Object.entries(errors.fieldErrors)
    .map(([key, error]) => `${key}: ${error[0]}`)
    .join(", ");
