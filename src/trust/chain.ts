import { decode, verify } from "./utils";
import {
  EntityConfiguration,
  type EntityConfiguration as EntityConfigurationType,
  EntityStatement,
  type EntityStatement as EntityStatementType,
  TrustAnchorEntityConfiguration,
  type TrustAnchorEntityConfiguration as TrustAnchorConfigurationType,
} from "./types";
import type { JWK } from "../utils/jwk";
import { IoWalletError } from "../utils/errors";
import {
  getFederationList,
  getSignedEntityConfiguration,
  getSignedEntityStatement,
} from ".";
import { applyMetadataPolicies } from "./policies";

/**
 * Build a not-verified trust chain for a given Relying Party (RP) entity.
 *
 * @param relyingPartyEntityBaseUrl The base URL of the RP entity
 * @param trustAnchorKey The public key of the Trust Anchor (TA) entity
 * @param appFetch An optional instance of the http client to be used.
 * @returns A list of signed tokens that represent the trust chain, in the order of the chain (from the RP to the Trust Anchor)
 * @throws {IoWalletError} When an element of the chain fails to parse
 * The result of this function can be used to validate the trust chain with {@link verifyTrustChain}
 */
export async function buildTrustChain(
  relyingPartyEntityBaseUrl: string,
  trustAnchorKey: JWK,
  appFetch: GlobalFetch["fetch"] = fetch
): Promise<string[]> {
  // 1: Recursively gather the trust chain from the RP up to the Trust Anchor
  const trustChain = await gatherTrustChain(
    relyingPartyEntityBaseUrl,
    appFetch
  );

  // 2: Trust Anchor signature verification
  const trustAnchorJwt = trustChain[trustChain.length - 1];
  if (!trustAnchorJwt) {
    throw new IoWalletError(
      "Cannot verify trust anchor: missing entity configuration."
    );
  }

  if (!trustAnchorKey.kid) {
    throw new IoWalletError("Missing 'kid' in provided Trust Anchor key.");
  }

  await verify(trustAnchorJwt, trustAnchorKey.kid, [trustAnchorKey]);

  // 3: Check the federation list
  const trustAnchorConfig = EntityConfiguration.parse(decode(trustAnchorJwt));
  const federationListEndpoint =
    trustAnchorConfig.payload.metadata.federation_entity
      .federation_list_endpoint;

  if (federationListEndpoint) {
    const federationList = await getFederationList(federationListEndpoint, {
      appFetch,
    });

    if (!federationList.includes(relyingPartyEntityBaseUrl)) {
      throw new IoWalletError(
        "Relying Party entity base URL is not authorized by the Trust Anchor's federation list."
      );
    }
  }

  return trustChain;
}

/**
 * Recursively gather the trust chain for an entity and all its superiors.
 * @param entityBaseUrl The base URL of the entity for which to gather the chain.
 * @param appFetch An optional instance of the http client to be used.
 * @param isLeaf Whether the current entity is the leaf of the chain.
 * @returns A full ordered list of JWTs (ECs and ESs) forming the trust chain.
 * The chain follows this order:
 * 1. Leaf Entity Configuration (EC)
 * 2. Leaf Entity Statement (ES)
 * 3. Intermediate Entity Statement (ES)
 * 4. Trust Anchor Entity Configuration (EC)
 */
async function gatherTrustChain(
  entityBaseUrl: string,
  appFetch: GlobalFetch["fetch"],
  isLeaf: boolean = true
): Promise<string[]> {
  const chain: string[] = [];

  // Fetch self-signed EC
  const entityECJwt = await getSignedEntityConfiguration(entityBaseUrl, {
    appFetch,
  });
  const entityEC = EntityConfiguration.parse(decode(entityECJwt));

  // For leaf entities, add their EC as the first element
  if (isLeaf) {
    chain.push(entityECJwt);
  }

  // Find authority_hints (parent, if any)
  const authorityHints = entityEC.payload.authority_hints ?? [];
  if (authorityHints.length === 0) {
    // This is the Trust Anchor (no parent)
    // Always add the Trust Anchor's EC as the last element
    chain.push(entityECJwt);
    return chain;
  }

  const parentEntityBaseUrl = authorityHints[0]!;

  // Fetch parent EC
  const parentECJwt = await getSignedEntityConfiguration(parentEntityBaseUrl, {
    appFetch,
  });
  const parentEC = EntityConfiguration.parse(decode(parentECJwt));

  // Fetch ES from parent
  const federationFetchEndpoint =
    parentEC.payload.metadata.federation_entity.federation_fetch_endpoint;
  if (!federationFetchEndpoint) {
    throw new IoWalletError(
      "Missing federation_fetch_endpoint in parent's configuration."
    );
  }

  const entityStatementJwt = await getSignedEntityStatement(
    federationFetchEndpoint,
    entityBaseUrl,
    { appFetch }
  );
  // Validate the ES
  EntityStatement.parse(decode(entityStatementJwt));

  // Add the ES to the chain
  chain.push(entityStatementJwt);

  // Recurse into the parent
  const parentChain = await gatherTrustChain(
    parentEntityBaseUrl,
    appFetch,
    false
  );

  // Concatenate with parent chain, ensuring Trust Anchor's EC is last
  return chain.concat(parentChain);
}

/**
 * Validates a provided trust chain against a known trust anchor
 *
 * @param trustAnchorEntity The entity configuration of the known trust anchor
 * @param chain The chain of statements to be validated
 * @returns The list of parsed token representing the chain
 * @throws {IoWalletError} If the chain is not valid
 */
export async function validateTrustChain(
  trustAnchorEntity: TrustAnchorConfigurationType,
  chain: string[]
): Promise<Array<EntityConfigurationType | EntityStatementType>> {
  // If the chain is empty, fail
  if (chain.length === 0) {
    throw new IoWalletError("Cannot verify empty trust chain");
  }

  // Select the expected token shape
  const selectTokenShape = (elementIndex: number) =>
    elementIndex === 0
      ? EntityConfiguration
      : elementIndex === chain.length - 1
      ? TrustAnchorEntityConfiguration
      : EntityStatement;

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
  return await Promise.all(
    chain.map(async (token, i) => {
      const kid = selectKid(i);
      const keys = selectKeys(i);
      await verify(token, kid, keys);
      return selectTokenShape(i).parse(decode(token));
    })
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

        // Get parent's EC to find the federation_fetch_endpoint
        const parentECJwt = await getSignedEntityConfiguration(parentBaseUrl, {
          appFetch,
        });
        const parentEC = EntityConfiguration.parse(decode(parentECJwt));
        const federationFetchEndpoint =
          parentEC.payload.metadata?.federation_entity
            ?.federation_fetch_endpoint;

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

/**
 * Build and validate a trust chain for a given entity.
 * This function handles the complete process of building and validating a trust chain,
 * including metadata policy application.
 *
 * @param entityUrl The URL of the entity to build the chain for
 * @param trustAnchorKey The public key of the Trust Anchor
 * @param appFetch Optional fetch implementation
 * @returns The validated trust chain with applied metadata
 */
export async function buildAndValidateTrustChain(
  entityUrl: string,
  trustAnchorKey: JWK,
  {
    appFetch = fetch,
  }: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<{
  chain: string[];
  appliedMetadata: Record<string, unknown>;
  expirationTime: number;
}> {
  // Build the trust chain
  const chain = await buildTrustChain(entityUrl, trustAnchorKey, appFetch);

  if (chain.length < 2) {
    throw new IoWalletError("Invalid trust chain: missing required elements");
  }

  const firstToken = chain[0];
  const secondToken = chain[1];

  if (!firstToken || !secondToken) {
    throw new IoWalletError("Invalid trust chain: missing required elements");
  }

  // Get the entity's configuration (first element in chain)
  const entityConfig = EntityConfiguration.parse(decode(firstToken));

  // Get the subordinate statement (second element in chain)
  const subordinateStatement = EntityStatement.parse(decode(secondToken));

  // Apply metadata policies
  const appliedMetadata = applyMetadataPolicies(
    entityConfig.payload.metadata,
    subordinateStatement
  );

  // Calculate minimum expiration time across the chain
  const expirationTime = Math.min(
    ...chain.map((token: string) => {
      const decoded = decode(token);
      if (!decoded.payload.exp) {
        throw new IoWalletError("Missing expiration time in token");
      }
      return decoded.payload.exp;
    })
  );

  return {
    chain,
    appliedMetadata,
    expirationTime,
  };
}
