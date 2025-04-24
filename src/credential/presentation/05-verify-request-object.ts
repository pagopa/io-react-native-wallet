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
 * Function to verify the Request Object's signature and the client ID.
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
  const { keys } = getJwksFromConfig(rpConf);

  // Verify token signature to ensure the request object is authentic
  const pubKey = keys?.find(
    ({ kid }) => kid === requestObjectJwt.protectedHeader.kid
  );

  if (!pubKey) {
    throw new InvalidRequestObjectError(
      "The public key for signature verification cannot be found in the Entity Configuration"
    );
  }

  try {
    // Standard claims are verified within `verify`
    await verify(requestObjectEncodedJwt, pubKey, { issuer: clientId });
  } catch (_) {
    throw new InvalidRequestObjectError(
      "The Request Object signature verification failed"
    );
  }

  const requestObjectParse = RequestObject.safeParse(requestObjectJwt.payload);

  if (!requestObjectParse.success) {
    throw new InvalidRequestObjectError(
      "The Request Object cannot be parsed successfully",
      formatFlattenedZodErrors(requestObjectParse.error.flatten())
    );
  }
  const { data: requestObject } = requestObjectParse;

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
 * Utility to format flattened Zod errors into a simplified string `key1: key1_error, key2: key2_error`
 */
const formatFlattenedZodErrors = (
  errors: Zod.typeToFlattenedError<RequestObject>
): string =>
  Object.entries(errors.fieldErrors)
    .map(([key, error]) => `${key}: ${error.at(0)}`)
    .join(", ");
