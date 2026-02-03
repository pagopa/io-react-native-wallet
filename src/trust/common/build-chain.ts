import {
  BuildTrustChainError,
  MissingFederationFetchEndpointError,
  RelyingPartyNotAuthorizedError,
  TrustAnchorKidMissingError,
} from "./errors";
import {
  decode,
  getFederationList,
  getSignedEntityConfiguration,
  getSignedEntityStatement,
  verify,
} from "./utils";
import { z } from "zod";
import type { TrustApi } from "../api";
import type { BaseEntityConfiguration, EntityStatement } from "./types";

type BuilderConfig = {
  EntityStatementShape: z.ZodType<EntityStatement>;
  EntityConfigurationShape: z.ZodType<BaseEntityConfiguration>;
};

/**
 * Factory function to create `buildTrustChain`.
 * @param config Version specific Entity shapes
 * @returns `buildTrustChain` function compliant with the public API
 */
export function createBuildTrustChain(
  config: BuilderConfig
): TrustApi["buildTrustChain"] {
  return async function buildTrustChain(
    relyingPartyEntityBaseUrl,
    trustAnchorConfig,
    appFetch = fetch
  ) {
    // 1: Verify if the RP is authorized by the Trust Anchor's federation list
    // Extract the Trust Anchor's signing key and federation_list_endpoint
    // (we assume the TA has only one key, as per spec)
    const trustAnchorKey = trustAnchorConfig.keys[0];

    if (!trustAnchorKey) {
      throw new BuildTrustChainError(
        "Cannot verify trust anchor: missing signing key in entity configuration."
      );
    }

    const federationListEndpoint = trustAnchorConfig.federation_list_endpoint;

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

    const gatherTrustChain = createGatherTrustChain(config);

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
  };
}

/**
 * Factory function to create `gatherTrustChain`.
 * @param config Version specific Entity shapes
 * @returns `gatherTrustChain` function.
 */
export function createGatherTrustChain({
  EntityConfigurationShape,
  EntityStatementShape,
}: BuilderConfig) {
  return async function gatherTrustChain(
    entityBaseUrl: string,
    appFetch: GlobalFetch["fetch"],
    isLeaf: boolean = true
  ): Promise<string[]> {
    const chain: string[] = [];

    // Fetch self-signed EC (only needed for the leaf)
    const entityECJwt = await getSignedEntityConfiguration(entityBaseUrl, {
      appFetch,
    });
    const entityEC = EntityConfigurationShape.parse(decode(entityECJwt));
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
    const parentECJwt = await getSignedEntityConfiguration(
      parentEntityBaseUrl,
      { appFetch }
    );
    const parentEC = EntityConfigurationShape.parse(decode(parentECJwt));
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
    EntityStatementShape.parse(decode(entityStatementJwt));

    // Push this ES into the chain
    chain.push(entityStatementJwt);

    // Recurse into the parent
    const parentChain = await gatherTrustChain(
      parentEntityBaseUrl,
      appFetch,
      false
    );

    return chain.concat(parentChain);
  };
}
