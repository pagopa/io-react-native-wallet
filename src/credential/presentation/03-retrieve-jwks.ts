import { JWKS, JWK } from "../../utils/jwk";
import { hasStatusOrThrow } from "../../utils/misc";
import { RelyingPartyEntityConfiguration } from "../../trust/types";

/**
 * Defines the signature for a function that retrieves JSON Web Key Sets (JWKS) from a client.
 *
 * @template T - The tuple type representing the function arguments.
 * @param args - The arguments passed to the function.
 * @returns A promise resolving to an object containing an array of JWKs.
 */
export type FetchJwks<T extends Array<unknown> = []> = (...args: T) => Promise<{
  keys: JWK[];
}>;

/**
 * Retrieves the JSON Web Key Set (JWKS) from the specified client's well-known endpoint.
 *
 * @param clientUrl - The base URL of the client entity from which to retrieve the JWKS.
 * @param options - Optional context containing a custom fetch implementation.
 * @param options.context - Optional context object.
 * @param options.context.appFetch - Optional custom fetch function to use instead of the global `fetch`.
 * @returns A promise resolving to an object containing an array of JWKs.
 * @throws Will throw an error if the JWKS retrieval fails.
 */
export const fetchJwksFromUri: FetchJwks<
  [string, { context?: { appFetch?: GlobalFetch["fetch"] } }]
> = async (clientUrl, { context = {} } = {}) => {
  const { appFetch = fetch } = context;
  const jwks = await retrieveJwks(clientUrl, "/jar-issuer/jwk", { appFetch });
  return {
    keys: jwks.keys,
  };
};

/**
 * Fetches the JWKS from a specific endpoint of the entity's well-known configuration.
 *
 * @param entityBaseUrl - The base URL of the entity.
 * @param jwksEndpointPath - The relative path to the JWKS endpoint within the well-known configuration.
 * @param options - Optional parameters including a custom fetch implementation.
 * @param options.appFetch - Optional custom fetch function to use instead of the global `fetch`.
 * @returns A promise resolving to the JWKS object.
 */
async function retrieveJwks(
  entityBaseUrl: string,
  jwksEndpointPath: string,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<JWKS> {
  const wellKnownUrl = `${entityBaseUrl}/.well-known${jwksEndpointPath}`;

  return await appFetch(wellKnownUrl, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((raw) => raw.json())
    .then((json) => JWKS.parse(json));
}

/**
 * Retrieves the JSON Web Key Set (JWKS) from a Relying Party's entity configuration.
 *
 * @param rpConfig - The configuration object of the Relying Party entity.
 * @returns An object containing an array of JWKs.
 * @throws Will throw an error if the configuration is invalid or if JWKS is not found.
 */
export const fetchJwksFromConfig: FetchJwks<
  [RelyingPartyEntityConfiguration]
> = async (rpConfig) => {
  const parsedConfig = RelyingPartyEntityConfiguration.safeParse(rpConfig);
  if (!parsedConfig.success) {
    throw new Error("Invalid Relying Party configuration.");
  }

  const jwks = parsedConfig.data.payload.metadata.wallet_relying_party.jwks;

  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new Error("JWKS not found in Relying Party configuration.");
  }

  return {
    keys: jwks.keys,
  };
};
