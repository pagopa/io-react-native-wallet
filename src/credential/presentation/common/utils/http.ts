import type { RequestObject } from "../../api";
import type { DirectAuthorizationBodyPayload } from "../../v1.0.0/types";

/**
 * Builds a URL-encoded form body for a direct POST response without encryption.
 *
 * @param requestObject - Contains state, nonce, and other relevant info.
 * @param payload - Object that contains either the VP token to encrypt and the stringified mapping of the credential disclosures or the error code
 * @returns A URL-encoded string suitable for an `application/x-www-form-urlencoded` POST body.
 */
export const buildDirectPostBody = async (
  requestObject: RequestObject,
  payload: DirectAuthorizationBodyPayload
): Promise<string> => {
  const formUrlEncodedBody = new URLSearchParams({
    state: requestObject.state,
    ...Object.entries(payload).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]:
          Array.isArray(value) || typeof value === "object"
            ? JSON.stringify(value)
            : value,
      }),
      {} as Record<string, string>
    ),
  });

  return formUrlEncodedBody.toString();
};
