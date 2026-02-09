import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import { type typeToFlattenedError } from "zod";
import type { RelyingPartyConfig, RemotePresentationApi } from "../api";
import { InvalidRequestObjectError } from "../common/errors";
import { getJwksFromRpConfig } from "./04-retrieve-rp-jwks";
import { RequestObjectPayload } from "./types";
import { mapToRequestObject } from "./mappers";

export const verifyRequestObject: RemotePresentationApi["verifyRequestObject"] =
  async (requestObjectEncodedJwt, { clientId, rpConf, state }) => {
    const requestObjectJwt = decodeJwt(requestObjectEncodedJwt);

    const pubKey = getSigPublicKey(
      rpConf,
      requestObjectJwt.protectedHeader.kid
    );

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
      clientId === requestObject.client_id && clientId === rpConf.subject;

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

    return { requestObject: mapToRequestObject(requestObject) };
  };

/**
 * Validate the shape of the Request Object to ensure all required properties are present and are of the expected type.
 *
 * @param payload The Request Object to validate
 * @returns A valid Request Object
 * @throws {InvalidRequestObjectError} when the Request Object cannot be parsed
 */
const validateRequestObjectShape = (payload: unknown): RequestObjectPayload => {
  const requestObjectParse = RequestObjectPayload.safeParse(payload);

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
  rpConf: RelyingPartyConfig,
  kid: string | undefined
) => {
  try {
    const { keys } = getJwksFromRpConfig(rpConf);

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
  errors: typeToFlattenedError<RequestObjectPayload>
): string =>
  Object.entries(errors.fieldErrors)
    .map(([key, error]) => `${key}: ${error[0]}`)
    .join(", ");
