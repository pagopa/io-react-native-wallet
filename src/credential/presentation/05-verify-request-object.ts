import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { InvalidRequestObjectError } from "./errors";
import { RequestObject } from "./types";
import { type FetchJwks } from "./04-retrieve-rp-jwks";
import type { Out } from "../../utils/misc";
import { LogLevel, Logger } from "../../utils/logging";

export type VerifyRequestObject = (
  requestObjectEncodedJwt: string,
  jwkKeys: Out<FetchJwks>["keys"]
) => Promise<{ requestObject: RequestObject }>;

/**
 * Function to verify the Request Object's validity, from the signature to the required properties.
 * @param requestObjectEncodedJwt The Request Object in JWT format
 * @param jwkKeys The JWKS to use for signature validation
 * @returns The verified Request Object
 * @throws {InvalidRequestObjectError} if the Request Object cannot be validated
 */
export const verifyRequestObject: VerifyRequestObject = async (
  requestObjectEncodedJwt,
  jwkKeys
) => {
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);

  // verify token signature to ensure the request object is authentic
  const pubKey =
    jwkKeys.find(({ kid }) => kid === requestObjectJwt.protectedHeader.kid) ||
    jwkKeys.find(({ use }) => use === "sig");

  if (!pubKey) {
    throw new InvalidRequestObjectError(
      "The Request Object signature verification failed"
    );
  }

  try {
    // Standard claims are verified within `verify`
    await verify(requestObjectEncodedJwt, pubKey);
  } catch (_) {
    throw new InvalidRequestObjectError(
      "The Request Object signature verification failed"
    );
  }

  const requestObject = validateRequestObjectShape(requestObjectJwt.payload);

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

/**
 * Utility to format flattened Zod errors into a simplified string `key1: key1_error, key2: key2_error`
 */
const formatFlattenedZodErrors = (
  errors: Zod.typeToFlattenedError<RequestObject>
): string =>
  Object.entries(errors.fieldErrors)
    .map(([key, error]) => `${key}: ${error[0]}`)
    .join(", ");
