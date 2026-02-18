import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";
import type { RelyingPartyConfig, RemotePresentationApi } from "../api";
import { InvalidRequestObjectError } from "../common/errors";
import { mapToRequestObject } from "./mappers";
import { getJwksFromRpConfig } from "./utils";
import { validateWithSchema } from "../common/utils";
import { RequestObjectPayload } from "./types";

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

    const requestObject = validateWithSchema(
      RequestObjectPayload,
      requestObjectJwt.payload,
      (message, reason) => new InvalidRequestObjectError(message, reason),
      "The Request Object cannot be parsed successfully"
    );

    const isClientIdMatch =
      clientId === requestObject.client_id && clientId === rpConf.subject;

    if (!isClientIdMatch) {
      throw new InvalidRequestObjectError(
        "Client ID does not match Request Object or Entity Configuration"
      );
    }

    const isStateMatch = state ? state === requestObject.state : true;

    if (!isStateMatch) {
      throw new InvalidRequestObjectError(
        "The provided state does not match the Request Object's"
      );
    }

    return { requestObject: mapToRequestObject(requestObject) };
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
