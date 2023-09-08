import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { EntityConfiguration } from "./types";
import { IoWalletError } from "../utils/errors";
import { verifyTrustChain } from "./chain";

export { verifyTrustChain };

/**
 * Fetch and parse teh entity configuration document for a given federation entity
 *
 * @param entityBaseUrl The base url of the entity.
 * @param options.appFetch An optional instance of the http client to be used.
 * @returns The parsed entity configuration object
 * @throws {IoWalletError} If the http request fails
 * @throws Parse error if the document is not in the expected shape.
 */
export async function getEntityConfiguration(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<EntityConfiguration> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-federation`;

  const response = await appFetch(wellKnownUrl, {
    method: "GET",
  });

  if (response.status === 200) {
    const responseText = await response.text();
    const responseJwt = decodeJwt(responseText);
    return EntityConfiguration.parse({
      header: responseJwt.protectedHeader,
      payload: responseJwt.payload,
    });
  }

  throw new IoWalletError(
    `Unable to obtain Entity Configuration at ${wellKnownUrl}. Response code: ${response.status}`
  );
}
