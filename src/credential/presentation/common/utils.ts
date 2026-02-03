import { JWK } from "../../utils/jwk";
import { RelyingPartyEntityConfiguration } from "../../trust/v1.0.0/types"; // TODO: [SIW-3742] refactor presentation

/**
 * Defines the signature for a function that retrieves JSON Web Key Sets (JWKS) from a client.
 *
 * @template T - The tuple type representing the function arguments.
 * @param args - The arguments passed to the function.
 * @returns A promise resolving to an object containing an array of JWKs.
 */
export type FetchJwks<T extends Array<unknown> = []> = (...args: T) => {
  keys: JWK[];
};

/**
 * Retrieves the JSON Web Key Set (JWKS) from a Relying Party's entity configuration.
 *
 * @param rpConfig - The configuration object of the Relying Party entity.
 * @returns An object containing an array of JWKs.
 * @throws Will throw an error if the configuration is invalid or if JWKS is not found.
 */
export const getJwksFromConfig: FetchJwks<
  [RelyingPartyEntityConfiguration["payload"]["metadata"]]
> = (rpConfig) => {
  const jwks = rpConfig.openid_credential_verifier.jwks;

  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new Error("JWKS not found in Relying Party configuration.");
  }

  return {
    keys: jwks.keys,
  };
};
