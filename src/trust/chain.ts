import {
  EntityConfiguration,
  EntityStatement,
  TrustAnchorEntityConfiguration,
} from "./types";
import { JWK } from "../utils/jwk";
import { IoWalletError } from "../utils/errors";
import * as z from "zod";
import { getSignedEntityConfiguration, getSignedEntityStatement } from ".";
import { decode, type ParsedToken, verify } from "./utils";

// The first element of the chain is supposed to be the Entity Configuration for the document issuer
const FirstElementShape = EntityConfiguration;
// Each element but the first is supposed to be an Entity Statement
const MiddleElementShape = EntityStatement;
// The last element of the chain can either be an Entity Statement
//  or the Entity Configuration for the known Trust Anchor
const LastElementShape = z.union([
  EntityStatement,
  TrustAnchorEntityConfiguration,
]);

/**
 * Validates a provided trust chain against a known trust
 *
 * @param trustAnchorEntity The entity configuration of the known trust anchor
 * @param chain The chain of statements to be validated
 * @returns The list of parsed token representing the chain
 * @throws {IoWalletError} If the chain is not valid
 */
export async function validateTrustChain(
  trustAnchorEntity: TrustAnchorEntityConfiguration,
  chain: string[]
): Promise<ParsedToken[]> {
  // If the chain is empty, fail
  if (chain.length === 0) {
    throw new IoWalletError("Cannot verify empty trust chain");
  }

  // Select the expected token shape
  const selectTokenShape = (elementIndex: number) =>
    elementIndex === 0
      ? FirstElementShape
      : elementIndex === chain.length - 1
      ? LastElementShape
      : MiddleElementShape;

  // select the kid from the current index
  const selectKid = (currentIndex: number): string => {
    const token = chain[currentIndex];
    if (!token) {
      throw new IoWalletError(`Cannot select kid: empty token`);
    }
    const shape = selectTokenShape(currentIndex);
    return shape.parse(decode(token)).header.kid;
  };

  // select keys from the next token
  // if the current token is the last, keys from trust anchor will be used
  const selectKeys = (currentIndex: number): JWK[] => {
    if (currentIndex === chain.length - 1) {
      return trustAnchorEntity.payload.jwks.keys;
    }

    const nextIndex = currentIndex + 1;
    const nextToken = chain[nextIndex];
    if (!nextToken) {
      throw new IoWalletError(`Cannot select keys: empty nextToken`);
    }
    const shape = selectTokenShape(nextIndex);
    return shape.parse(decode(nextToken)).payload.jwks.keys;
  };

  // Iterate the chain and validate each element's signature against the public keys of its next
  // If there is no next, hence it's the end of the chain, and it must be verified by the Trust Anchor
  return Promise.all(
    chain
      .map((token, i) => [token, selectKid(i), selectKeys(i)] as const)
      .map((args) => verify(...args))
  );
}

/**
 * Given a trust chain, obtain a new trust chain by fetching each element's fresh version
 *
 * @param chain The original chain
 * @param appFetch (optional) fetch api implementation
 * @returns A list of signed token that represent the trust chain, in the same order of the provided chain
 * @throws IoWalletError When an element of the chain fails to parse
 */
export async function renewTrustChain(
  chain: string[],
  appFetch: GlobalFetch["fetch"] = fetch
): Promise<string[]> {
  return Promise.all(
    chain.map(async (token, index) => {
      const decoded = decode(token);

      const entityStatementResult = EntityStatement.safeParse(decoded);
      const entityConfigurationResult = EntityConfiguration.safeParse(decoded);

      if (entityConfigurationResult.success) {
        return getSignedEntityConfiguration(
          entityConfigurationResult.data.payload.iss,
          { appFetch }
        );
      }
      if (entityStatementResult.success) {
        const entityStatement = entityStatementResult.data;

        const parentBaseUrl = entityStatement.payload.iss;
        const parentECJwt = await getSignedEntityConfiguration(parentBaseUrl, {
          appFetch,
        });
        const parentEC = EntityConfiguration.parse(decode(parentECJwt));

        const federationFetchEndpoint =
          parentEC.payload.metadata.federation_entity.federation_fetch_endpoint;
        if (!federationFetchEndpoint) {
          throw new IoWalletError(
            `Parent EC at ${parentBaseUrl} is missing federation_fetch_endpoint`
          );
        }
        return getSignedEntityStatement(
          federationFetchEndpoint,
          entityStatement.payload.sub,
          { appFetch }
        );
      }
      throw new IoWalletError(
        `Cannot renew trust chain because element #${index} failed to parse.`
      );
    })
  );
}
