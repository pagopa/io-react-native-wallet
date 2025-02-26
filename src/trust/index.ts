import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import {
  CredentialIssuerEntityConfiguration,
  EntityConfiguration,
  EntityStatement,
  RelyingPartyEntityConfiguration,
  TrustAnchorEntityConfiguration,
  WalletProviderEntityConfiguration,
} from "./types";
import { renewTrustChain, validateTrustChain } from "./chain";
import { hasStatusOrThrow } from "../utils/misc";
import { IoWalletError } from "../utils/errors";

export type {
  WalletProviderEntityConfiguration,
  TrustAnchorEntityConfiguration,
  CredentialIssuerEntityConfiguration,
  RelyingPartyEntityConfiguration,
  EntityConfiguration,
  EntityStatement,
};

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
 * @param accreditationBodyBaseUrl The base url of the accreditation body which holds and signs the required entity statement
 * @param subordinatedEntityBaseUrl The url that identifies the subordinate entity
 * @param appFetch An optional instance of the http client to be used.
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

/**
 * Build a not-verified trust chain for a given Relying Party (RP) entity.
 * @param rpEntityBaseUrl The base URL of the RP entity
 * @param appFetch (optional) fetch api implementation
 * @returns A list of signed tokens that represent the trust chain, in the order of the chain (from the RP to the Trust Anchor)
 * @throws {IoWalletError} When an element of the chain fails to parse
 * The result of this function can be used to validate the trust chain with {@link verifyTrustChain}
 */
export async function buildTrustChain(
  rpEntityBaseUrl: string,
  appFetch: GlobalFetch["fetch"] = fetch
): Promise<string[]> {
  const chain: string[] = [];

  // 1. Fetch and validate the RP's Entity Configuration (EC)
  let currentECJwt = await getSignedEntityConfiguration(rpEntityBaseUrl, {
    appFetch,
  });
  chain.push(currentECJwt);
  let currentEC = EntityConfiguration.parse(decodeJwt(currentECJwt));

  // 2. Loop until we reach a self-signed EC (i.e. trust anchor: iss === sub)
  while (currentEC.payload.iss !== currentEC.payload.sub) {
    // Use authority_hints to identify the parent's base URL.
    if (
      !currentEC.payload.authority_hints ||
      currentEC.payload.authority_hints.length === 0
    ) {
      throw new IoWalletError(
        "Missing authority_hints in current entity configuration."
      );
    }
    const parentBaseUrl = currentEC.payload.authority_hints?.[0];
    if (!parentBaseUrl) {
      throw new IoWalletError(
        "Missing authority_hints in current entity configuration."
      );
    }

    // Fetch and validate the parent's Entity Configuration (EC)
    const parentECJwt = await getSignedEntityConfiguration(parentBaseUrl, {
      appFetch,
    });
    const parentEC = EntityConfiguration.parse(decodeJwt(parentECJwt));

    // Validate that the parent's configuration provides the federation_fetch_endpoint
    const federationFetchEndpoint =
      parentEC.payload.metadata.federation_entity.federation_fetch_endpoint;
    if (!federationFetchEndpoint) {
      throw new IoWalletError(
        "Missing federation_fetch_endpoint in parent's configuration."
      );
    }

    // Use the signed function to fetch and validate the Entity Statement (ES)
    const esJwt = await getSignedEntityStatement(
      federationFetchEndpoint,
      currentEC.payload.sub,
      { appFetch }
    );
    EntityStatement.parse(decodeJwt(esJwt)); // Will throw if ES is invalid

    // Append the ES and then the parent's EC to the trust chain
    chain.push(esJwt);
    chain.push(parentECJwt);

    // Prepare for the next iteration: the parent becomes the new current entity.
    currentECJwt = parentECJwt;
    currentEC = EntityConfiguration.parse(decodeJwt(currentECJwt));
  }

  return chain;
}
