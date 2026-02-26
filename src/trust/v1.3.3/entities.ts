import type z from "zod";
import {
  type FetchOptions,
  getSignedEntityConfiguration,
} from "../common/utils";
import { EntityConfiguration, RelyingPartyEntityConfiguration } from "./types";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";

/**
 * Fetch and parse the entity configuration document for a given federation entity.
 * This is an inner method to serve public interfaces.
 * @version 1.3.3
 *
 * To add another entity configuration type (example: Foo entity type):
 *  - create its zod schema and type by inherit from the base type (example: FooEntityConfiguration = BaseEntityConfiguration.and(...))
 *  - add such type to EntityConfiguration union
 *  - create a public function which use such type (example: getFooEntityConfiguration = (url, options) => Promise<FooEntityConfiguration>)
 *
 * @param entityBaseUrl The base url of the entity.
 * @param schema The expected schema of the entity configuration, according to the kind of entity we are fetching from.
 * @param options An optional object with additional options.
 * @param options.appFetch An optional instance of the http client to be used.
 * @returns The parsed entity configuration object
 * @throws {IoWalletError} If the http request fails
 * @throws Parse error if the document is not in the expected shape.
 */
async function fetchAndParseEntityConfiguration<T extends EntityConfiguration>(
  entityBaseUrl: string,
  schema: z.ZodType<T>,
  { appFetch = fetch }: FetchOptions = {}
): Promise<T> {
  const responseText = await getSignedEntityConfiguration(entityBaseUrl, {
    appFetch,
  });

  const responseJwt = decodeJwt(responseText);
  return schema.parse({
    header: responseJwt.protectedHeader,
    payload: responseJwt.payload,
  });
}

export const getRelyingPartyEntityConfiguration = (
  entityBaseUrl: string,
  options?: FetchOptions
) =>
  fetchAndParseEntityConfiguration(
    entityBaseUrl,
    RelyingPartyEntityConfiguration,
    options
  );
