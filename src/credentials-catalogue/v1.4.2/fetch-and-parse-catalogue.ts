import { getTrustAnchorEntityConfiguration } from "../../trust/v1.0.0/entities"; // TODO: use trust from v1.3.3
import { type CredentialsCatalogueApi as Api } from "../api";
import { mapToCredentialsCatalogue } from "./mappers";
import {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
  TaxonomyRegistry,
} from "./types";
import { fetchRegistry } from "./utils";

export const fetchAndParseCatalogue: Api["fetchAndParseCatalogue"] = async (
  trustAnchorBaseUrl,
  { appFetch = fetch } = {},
) => {
  const trustAnchorConfig = await getTrustAnchorEntityConfiguration(
    trustAnchorBaseUrl,
    { appFetch },
  );
  const trustAnchorJwks = trustAnchorConfig.payload.jwks.keys;

  const discovery = await fetchRegistry(
    `${trustAnchorConfig.payload.sub}/.well-known/it-wallet-registry`,
    {
      appFetch,
      jwks: trustAnchorJwks,
      schema: RegistryDiscoveryJwt,
    },
  );
  const { endpoints } = discovery.payload;

  // Fetch registries necessary to build the full catalogue
  const registries = await Promise.all([
    fetchRegistry(endpoints.credential_catalog, {
      appFetch,
      jwks: trustAnchorJwks,
      schema: DigitalCredentialsCatalogueJwt,
    }),
    fetchRegistry(endpoints.authentic_sources, {
      appFetch,
      asJson: true,
      schema: AuthenticSourceRegistry,
    }),
    fetchRegistry(endpoints.schema_registry, {
      appFetch,
      asJson: true,
      schema: SchemaRegistry,
    }),
    fetchRegistry(endpoints.taxonomy, {
      appFetch,
      asJson: true,
      schema: TaxonomyRegistry,
    }),
  ]);

  return mapToCredentialsCatalogue([discovery, ...registries]);
};
