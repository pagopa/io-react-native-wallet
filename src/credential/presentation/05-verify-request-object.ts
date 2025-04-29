import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import type { RelyingPartyEntityConfiguration } from "../../trust";
import { InvalidRequestObjectError } from "./errors";
import { RequestObject } from "./types";
import { getJwksFromConfig } from "./04-retrieve-rp-jwks";

export type VerifyRequestObject = (
  requestObjectEncodedJwt: string,
  context: {
    clientId: string;
    rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"];
    rpSubject: string;
    state?: string;
  }
) => Promise<{ requestObject: RequestObject }>;

/**
 * Function to verify the Request Object's validity, from the signature to the required properties.
 * @param requestObjectEncodedJwt The Request Object in JWT format
 * @param context.clientId The client ID to verify
 * @param context.rpConf The Entity Configuration of the Relying Party
 * @param context.state Optional state
 * @returns The verified Request Object
 * @throws {InvalidRequestObjectError} if the Request Object cannot be validated
 */
export const verifyRequestObject: VerifyRequestObject = async (
  requestObjectEncodedJwt,
  { clientId, rpConf, rpSubject, state }
) => {
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);

  const pubKey = getSigPublicKey(rpConf, requestObjectJwt.protectedHeader.kid);

  try {
    // Standard claims are verified within `verify`
    await verify(requestObjectEncodedJwt, pubKey, { issuer: clientId });
  } catch (_) {
    throw new InvalidRequestObjectError(
      "The Request Object signature verification failed"
    );
  }

  const requestObject = validateRequestObjectShape(requestObjectJwt.payload);

  const isClientIdMatch =
    clientId === requestObject.client_id && clientId === rpSubject;

  if (!isClientIdMatch) {
    throw new InvalidRequestObjectError(
      "Client ID does not match Request Object or Entity Configuration"
    );
  }

  const isStateMatch =
    state && requestObject.state ? state === requestObject.state : true;

  if (!isStateMatch) {
    throw new InvalidRequestObjectError(
      "The provided state does not match the Request Object's"
    );
  }

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
 * Get the public key to verify the Request Object's signature from the Relying Party's EC.
 *
 * @param rpConf The Relying Party's EC
 * @param kid The identifier of the key to find
 * @returns The corresponding public key to verify the signature
 * @throws {InvalidRequestObjectError} when the key cannot be found
 */
const getSigPublicKey = (
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"],
  kid: string | undefined
) => {
  try {
    const { keys } = getJwksFromConfig(rpConf);

    const pubKey = keys.find((k) => k.kid === kid);

    if (!pubKey) throw new Error();

    return pubKey;
  } catch (_) {
    throw new InvalidRequestObjectError(
      `The public key for signature verification (${kid}) cannot be found in the Entity Configuration`
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
