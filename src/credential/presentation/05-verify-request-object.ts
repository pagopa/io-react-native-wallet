import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { InvalidRequestObjectError } from "./errors";
import { RequestObject } from "./types";
import { getJwksFromConfig, type FetchJwks } from "./04-retrieve-rp-jwks";
import type { RelyingPartyEntityConfiguration } from "../../trust/types";
import type { Out } from "../../utils/misc";
import { LogLevel, Logger } from "../../utils/logging";

export type VerifyRequestObject = (
  requestObjectEncodedJwt: string,
  context: {
    jwkKeys: Out<FetchJwks>["keys"];
    clientId: string;
    // rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"];
    // rpSubject: string;
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
  { clientId, jwkKeys, state }
) => {
  const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);

  // const pubKey = getSigPublicKey(rpConf, requestObjectJwt.protectedHeader.kid);
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

  /*
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
  } */

  Logger.log(
    LogLevel.DEBUG,
    "Verified Request Object: " + JSON.stringify(requestObject, null, 2)
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
 * Get the public key to verify the Request Object's signature from the Relying Party's EC.
 *
 * @param rpConf The Relying Party's EC
 * @param kid The identifier of the key to find
 * @returns The corresponding public key to verify the signature
 * @throws {InvalidRequestObjectError} when the key cannot be found
 */
const getSigPublicKey = async (
  rpConf: RelyingPartyEntityConfiguration["payload"]["metadata"],
  kid: string | undefined
) => {
  try {
    const { keys } = await getJwksFromConfig(rpConf);

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
