import {
  BuildTrustChainError,
  MissingFederationFetchEndpointError,
  RelyingPartyNotAuthorizedError,
  TrustAnchorKidMissingError,
} from "./common/errors";
import {
  decode,
  getFederationList,
  getSignedEntityConfiguration,
  getSignedEntityStatement,
  verify,
} from "./common/utils";
import { EntityStatement } from "./common/types";
// TODO: decouple from specific version types
import {
  EntityConfiguration,
  TrustAnchorEntityConfiguration,
} from "./v1.0.0/types";

/**
 * Build a not-verified trust chain for a given Relying Party (RP) entity.
 *
 * @param relyingPartyEntityBaseUrl The base URL of the RP entity
 * @param trustAnchorConfig The entity configuration of the known trust anchor.
 * @param appFetch An optional instance of the http client to be used.
 * @returns A list of signed tokens that represent the trust chain, in the order of the chain (from the RP to the Trust Anchor)
 * @throws {FederationError} When an element of the chain fails to parse or other build steps fail.
 */
export async function buildTrustChain(
  relyingPartyEntityBaseUrl: string,
  trustAnchorConfig: TrustAnchorEntityConfiguration,
  appFetch: GlobalFetch["fetch"] = fetch
): Promise<string[]> {
  // 1: Verify if the RP is authorized by the Trust Anchor's federation list
  // Extract the Trust Anchor's signing key and federation_list_endpoint
  // (we assume the TA has only one key, as per spec)
  const trustAnchorKey = trustAnchorConfig.payload.jwks.keys[0];

  if (!trustAnchorKey) {
    throw new BuildTrustChainError(
      "Cannot verify trust anchor: missing signing key in entity configuration."
    );
  }

  const federationListEndpoint =
    trustAnchorConfig.payload.metadata.federation_entity
      .federation_list_endpoint;

  if (federationListEndpoint) {
    const federationList = await getFederationList(federationListEndpoint, {
      appFetch,
    });

    if (!federationList.includes(relyingPartyEntityBaseUrl)) {
      throw new RelyingPartyNotAuthorizedError(
        "Relying Party entity base URL is not authorized by the Trust Anchor's federation list.",
        { relyingPartyUrl: relyingPartyEntityBaseUrl, federationListEndpoint }
      );
    }
  }

  // 1: Recursively gather the trust chain from the RP up to the Trust Anchor
  const trustChain = await gatherTrustChain(
    relyingPartyEntityBaseUrl,
    appFetch
  );
  // 2: Trust Anchor signature verification
  const chainTrustAnchorJwt = trustChain[trustChain.length - 1];
  if (!chainTrustAnchorJwt) {
    throw new BuildTrustChainError(
      "Cannot verify trust anchor: missing entity configuration in gathered chain.",
      { relyingPartyUrl: relyingPartyEntityBaseUrl }
    );
  }

  if (!trustAnchorKey.kid) {
    throw new TrustAnchorKidMissingError();
  }

  await verify(chainTrustAnchorJwt, trustAnchorKey.kid, [trustAnchorKey]);

  return trustChain;
}

/**
 * Recursively gather the trust chain for an entity and all its superiors.
 * @param entityBaseUrl The base URL of the entity for which to gather the chain.
 * @param appFetch An optional instance of the http client to be used.
 * @param isLeaf Whether the current entity is the leaf of the chain.
 * @returns A full ordered list of JWTs (ECs and ESs) forming the trust chain.
 * @throws {FederationError} If any of the fetched documents fail to parse or other errors occur during the gathering process.
 */
async function gatherTrustChain(
  entityBaseUrl: string,
  appFetch: GlobalFetch["fetch"],
  isLeaf: boolean = true
): Promise<string[]> {
  const chain: string[] = [];

  // Fetch self-signed EC (only needed for the leaf)
  const entityECJwt = await getSignedEntityConfiguration(entityBaseUrl, {
    appFetch,
  });
  const entityEC = EntityConfiguration.parse(decode(entityECJwt));
  if (isLeaf) {
    // Only push EC for the leaf
    chain.push(entityECJwt);
  }

  // Find authority_hints (parent, if any)
  const authorityHints = entityEC.payload.authority_hints ?? [];
  if (authorityHints.length === 0) {
    // This is the Trust Anchor (no parent)
    if (!isLeaf) {
      chain.push(entityECJwt);
    }
    return chain;
  }
  const parentEntityBaseUrl = authorityHints[0]!;

  // Fetch parent EC
  const parentECJwt = await getSignedEntityConfiguration(parentEntityBaseUrl, {
    appFetch,
  });
  const parentEC = EntityConfiguration.parse(decode(parentECJwt));
  // Fetch ES
  const federationFetchEndpoint =
    parentEC.payload.metadata.federation_entity.federation_fetch_endpoint;
  if (!federationFetchEndpoint) {
    throw new MissingFederationFetchEndpointError(
      `Missing federation_fetch_endpoint in parent's (${parentEntityBaseUrl}) configuration when gathering chain for ${entityBaseUrl}.`,
      { entityBaseUrl, missingInEntityUrl: parentEntityBaseUrl }
    );
  }
  const entityStatementJwt = await getSignedEntityStatement(
    federationFetchEndpoint,
    entityBaseUrl,
    { appFetch }
  );
  // Validate the ES
  EntityStatement.parse(decode(entityStatementJwt));

  // Push this ES into the chain
  chain.push(entityStatementJwt);

  // Recurse into the parent
  const parentChain = await gatherTrustChain(
    parentEntityBaseUrl,
    appFetch,
    false
  );

  return chain.concat(parentChain);
}
