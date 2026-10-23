import { hasStatusOrThrow } from "../../../utils/misc";

/**
 * Fetches the Status List Token referenced by a credential `status.status_list.uri`
 * (IETF Token Status List, Section 8.1), always bypassing the HTTP cache to get the current status.
 *
 * @param uri - The Status List Token URI
 * @param callbacks.fetch - (optional) The fetch implementation, defaults to the global one
 * @returns The Status List Token, as a JWT
 * @throws {UnexpectedStatusCodeError} If the Status List Token cannot be fetched
 */
export const fetchStatusList = (
  uri: string,
  callbacks: { fetch?: typeof fetch } = {},
): Promise<string> => {
  const { fetch: fetchFn = fetch } = callbacks;
  return fetchFn(uri, {
    headers: {
      Accept: "application/statuslist+jwt",
      "Cache-Control": "no-cache",
    },
  })
    .then(hasStatusOrThrow(200))
    .then((response) => response.text());
};
