import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import {
  WalletProviderEntityConfiguration,
  CredentialIssuerEntityConfiguration,
  EntityConfiguration,
  EntityStatement,
} from "./types";
import { hasStatusOrThrow } from "src/utils/misc";

export type {
  WalletProviderEntityConfiguration,
  CredentialIssuerEntityConfiguration,
  EntityConfiguration,
  EntityStatement,
};

/**
 * Fetch the signed entity configuration token for an entity
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param param.appFetch (optional) fetch api implemention
 * @returns The signed Entity Configuration token
 */
export async function getSignedEntityConfiguration(
  entityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<string> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid_credential_issuer`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());
}

/**
 * Fetch and parse the entity configuration document for a given federation entity.
 * This is an inner method to serve public interfaces.
 *
 * To add another entity configuration type (example: Foo entity type):
 *  - create its zod schema and type by inherit from the base type (example: FooEntityConfiguration = BaseEntityConfiguration.and(...))
 *  - add such type to EntityConfiguration union
 *  - add an overload to this function
 *  - create a public function which use such type (example: getFooEntityConfiguration = (url, options) => Promise<FooEntityConfiguration>)
 *
 * @param entityBaseUrl The base url of the entity.
 * @param schema The expected schema of the entity configuration, according to the kind of entity we are fetching from.
 * @param options.appFetch An optional instance of the http client to be used.
 * @returns The parsed entity configuration object
 * @throws {IoWalletError} If the http request fails
 * @throws Parse error if the document is not in the expected shape.
 */
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof WalletProviderEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<WalletProviderEntityConfiguration>;
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof CredentialIssuerEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<CredentialIssuerEntityConfiguration>;
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: /* FIXME: why is it different from "typeof EntityConfiguration"? */
  | typeof CredentialIssuerEntityConfiguration
    | typeof WalletProviderEntityConfiguration,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
) {
  const responseText = await getSignedEntityConfiguration(entityBaseUrl, {
    appFetch,
  });

  const responseJwt = decodeJwt(responseText);
  return schema.parse({
    header: responseJwt.protectedHeader,
    payload: responseJwt.payload,
  });
}

export const getWalletProviderEntityConfiguration = (
  entityBaseUrl: Parameters<typeof fetchAndParseEntityConfiguration>[0],
  options?: Parameters<typeof fetchAndParseEntityConfiguration>[2]
) =>
  fetchAndParseEntityConfiguration(
    entityBaseUrl,
    WalletProviderEntityConfiguration,
    options
  );

export const getCredentialIssuerEntityConfiguration = (
  entityBaseUrl: Parameters<typeof fetchAndParseEntityConfiguration>[0],
  options?: Parameters<typeof fetchAndParseEntityConfiguration>[2]
) =>
  fetchAndParseEntityConfiguration(
    entityBaseUrl,
    CredentialIssuerEntityConfiguration,
    options
  );

/**
 * Fetch the entity statement document for a given federation entity.
 *
 * @param accreditationBodyBaseUrl The base url of the accreditaion body which holds and signs the required entity statement
 * @param subordinatedEntityBaseUrl The url that identifies the subordinate entity
 * @param options.appFetch An optional instance of the http client to be used.
 * @returns The signed entity statement token
 * @throws {IoWalletError} If the http request fails
 */
export async function getSignedEntityStatement(
  accreditationBodyBaseUrl: string,
  subordinatedEntityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
) {
  const url = `${accreditationBodyBaseUrl}/fetch?${new URLSearchParams({
    sub: subordinatedEntityBaseUrl,
  })}`;

  return await appFetch(url, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());
}
