import { getTrustAnchorEntityConfiguration } from "../../trust/v1.0.0/entities"; // TODO: use trust from v1.3.3
import { type CredentialsCatalogueApi as Api } from "../api";
import {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
} from "./types";
import { mapToCredentialsCatalogue } from "./mappers";
import { fetchRegistry } from "./utils";

export const fetchAndParseCatalogue: Api["fetchAndParseCatalogue"] = async (
  trustAnchorBaseUrl,
  { appFetch = fetch } = {}
) => {
  const trustAnchorConfig =
    await getTrustAnchorEntityConfiguration(trustAnchorBaseUrl);
  const trustAnchorJwks = trustAnchorConfig.payload.jwks.keys;

  const discovery = await fetchRegistry(
    `${trustAnchorConfig.payload.sub}/.well-known/it-wallet-registry`,
    {
      schema: RegistryDiscoveryJwt,
      jwks: trustAnchorJwks,
      appFetch,
    }
  );
  const { endpoints } = discovery.payload;

  // Fetch registries necessary to build the full catalogue
  const registries = await Promise.all([
    fetchRegistry(endpoints.credential_catalog, {
      schema: DigitalCredentialsCatalogueJwt,
      jwks: trustAnchorJwks,
      appFetch,
    }),
    fetchRegistry(endpoints.authentic_sources, {
      schema: AuthenticSourceRegistry,
      jsonOnly: true,
      appFetch,
    }),
    fetchRegistry(endpoints.schema_registry, {
      schema: SchemaRegistry,
      jsonOnly: true,
      appFetch,
    }),
  ]);

  return mapToCredentialsCatalogue([discovery, ...registries]);
};
