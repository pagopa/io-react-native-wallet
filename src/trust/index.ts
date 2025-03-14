import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow } from "../utils/misc";
import { IoWalletError } from "../utils/errors";

import {
  CredentialIssuerEntityConfiguration,
  EntityConfiguration,
  EntityStatement,
  FederationListResponse,
  RelyingPartyEntityConfiguration,
  TrustAnchorEntityConfiguration,
  WalletProviderEntityConfiguration,
} from "./types";

import { renewTrustChain, validateTrustChain } from "./chain";

/**
 * Verify a given trust chain is actually valid.
 * It can handle fast chain renewal, which means we try to fetch a fresh version of each statement.
 *
 * @param trustAnchorEntity The entity configuration of the known trust anchor
 * @param chain The chain of statements to be validated
 * @param renewOnFail Whether to renew the provided chain if the validation fails at first. Default: true
 * @param appFetch Fetch api implementation. Default: the built-in implementation
 * @returns The result of the chain validation
 * @throws {IoWalletError} When either validation or renewal fail
 */
export async function verifyTrustChain(
  trustAnchorEntity: TrustAnchorEntityConfiguration,
  chain: string[],
  {
    appFetch = fetch,
    renewOnFail = true,
  }: { appFetch?: GlobalFetch["fetch"]; renewOnFail?: boolean } = {}
): Promise<ReturnType<typeof validateTrustChain>> {
  try {
    return validateTrustChain(trustAnchorEntity, chain);
  } catch (error) {
    if (renewOnFail) {
      const renewedChain = await renewTrustChain(chain, appFetch);
      return validateTrustChain(trustAnchorEntity, renewedChain);
    } else {
      throw error;
    }
  }
}

/**
 * Fetch the signed entity configuration token for an entity
 *
 * @param entityBaseUrl The url of the entity to fetch
 * @param appFetch (optional) fetch api implementation
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
  const wellKnownUrl = `${entityBaseUrl}/.well-known/openid-federation`;

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
 * @param options An optional object with additional options.
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
  schema: typeof RelyingPartyEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<RelyingPartyEntityConfiguration>;
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof TrustAnchorEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<TrustAnchorEntityConfiguration>;
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof CredentialIssuerEntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<CredentialIssuerEntityConfiguration>;
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: typeof EntityConfiguration,
  options?: {
    appFetch?: GlobalFetch["fetch"];
  }
): Promise<EntityConfiguration>;
async function fetchAndParseEntityConfiguration(
  entityBaseUrl: string,
  schema: /* FIXME: why is it different from "typeof EntityConfiguration"? */
  | typeof CredentialIssuerEntityConfiguration
    | typeof WalletProviderEntityConfiguration
    | typeof RelyingPartyEntityConfiguration
    | typeof TrustAnchorEntityConfiguration
    | typeof EntityConfiguration,
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

export const getTrustAnchorEntityConfiguration = (
  entityBaseUrl: Parameters<typeof fetchAndParseEntityConfiguration>[0],
  options?: Parameters<typeof fetchAndParseEntityConfiguration>[2]
) =>
  fetchAndParseEntityConfiguration(
    entityBaseUrl,
    TrustAnchorEntityConfiguration,
    options
  );

export const getRelyingPartyEntityConfiguration = (
  entityBaseUrl: Parameters<typeof fetchAndParseEntityConfiguration>[0],
  options?: Parameters<typeof fetchAndParseEntityConfiguration>[2]
) =>
  fetchAndParseEntityConfiguration(
    entityBaseUrl,
    RelyingPartyEntityConfiguration,
    options
  );

export const getEntityConfiguration = (
  entityBaseUrl: Parameters<typeof fetchAndParseEntityConfiguration>[0],
  options?: Parameters<typeof fetchAndParseEntityConfiguration>[2]
) =>
  fetchAndParseEntityConfiguration(entityBaseUrl, EntityConfiguration, options);

/**
 * Fetch and parse the entity statement document for a given federation entity.
 *
 * @param accreditationBodyBaseUrl The base url of the accreditation body which holds and signs the required entity statement
 * @param subordinatedEntityBaseUrl The url that identifies the subordinate entity
 * @param appFetch An optional instance of the http client to be used.
 * @returns The parsed entity configuration object
 * @throws {IoWalletError} If the http request fails
 * @throws Parse error if the document is not in the expected shape.
 */
export async function getEntityStatement(
  accreditationBodyBaseUrl: string,
  subordinatedEntityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
) {
  const responseText = await getSignedEntityStatement(
    accreditationBodyBaseUrl,
    subordinatedEntityBaseUrl,
    {
      appFetch,
    }
  );

  const responseJwt = decodeJwt(responseText);
  return EntityStatement.parse({
    header: responseJwt.protectedHeader,
    payload: responseJwt.payload,
  });
}

/**
 * Fetch the entity statement document for a given federation entity.
 *
 * @param federationFetchEndpoint The exact endpoint provided by the parent EC's metadata.
 * @param subordinatedEntityBaseUrl The url that identifies the subordinate entity.
 * @param appFetch An optional instance of the http client to be used.
 * @returns The signed entity statement token.
 * @throws {IoWalletError} If the http request fails.
 */
export async function getSignedEntityStatement(
  federationFetchEndpoint: string,
  subordinatedEntityBaseUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
) {
  const url = new URL(federationFetchEndpoint);
  url.searchParams.set("sub", subordinatedEntityBaseUrl);

  return await appFetch(url.toString(), {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());
}

/**
 * Fetch the federation list document from a given endpoint.
 *
 * @param federationListEndpoint The URL of the federation list endpoint.
 * @param appFetch An optional instance of the http client to be used.
 * @returns The federation list as an array of strings.
 * @throws {IoWalletError} If the HTTP request fails or the response cannot be parsed.
 */
export async function getFederationList(
  federationListEndpoint: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<string[]> {
  return await appFetch(federationListEndpoint, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((json) => {
      const result = FederationListResponse.safeParse(json);
      if (!result.success) {
        throw new IoWalletError(
          `Invalid federation list format received from Trust Anchor: ${result.error.message}`
        );
      }
      return result.data;
    });
}

/**
 * Get all Credential Issuer entities from the Trust Anchor's subordinate list endpoint.
 *
 * @param trustAnchorUrl The URL of the Trust Anchor
 * @param appFetch Optional fetch implementation
 * @returns Array of Credential Issuer entity identifiers
 * @throws {IoWalletError} If the request fails or the response is invalid
 */
export async function getCredentialIssuerEntities(
  trustAnchorUrl: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<string[]> {
  // Get Trust Anchor's entity configuration
  const trustAnchorConfig = await getTrustAnchorEntityConfiguration(
    trustAnchorUrl,
    { appFetch }
  );

  // Get the subordinate list endpoint
  const subordinateListEndpoint =
    trustAnchorConfig.payload.metadata.federation_entity
      .federation_list_endpoint;
  if (!subordinateListEndpoint) {
    throw new IoWalletError(
      "Missing federation_list_endpoint in Trust Anchor configuration"
    );
  }

  // Fetch and parse the list of subordinate entities
  return getFederationList(subordinateListEndpoint, { appFetch });
}
