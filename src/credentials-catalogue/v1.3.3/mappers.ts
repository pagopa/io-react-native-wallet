import { createMapper } from "../../utils/mappers";
import { assert } from "../../utils/misc";
import { groupBy, keyBy } from "../../utils/object";
import {
  type AuthenticSource as ApiAuthenticSource,
  type CredentialFormat as ApiCredentialFormat,
  DigitalCredentialsCatalogue,
} from "../api/DigitalCredentialsCatalogue";
import {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
  TaxonomyRegistry,
} from "./types";

export const mapToCredentialsCatalogue = createMapper<
  [
    RegistryDiscoveryJwt,
    DigitalCredentialsCatalogueJwt,
    AuthenticSourceRegistry,
    SchemaRegistry,
    TaxonomyRegistry,
  ],
  DigitalCredentialsCatalogue
>(
  ([
    discoveryJwt,
    catalogueJwt,
    authSourceRegistry,
    schemaRegistry,
    taxonomyRegistry,
  ]) => {
    const authSourcesById = keyBy(
      authSourceRegistry.authentic_sources,
      "entity_id",
    );
    const schemasByCredentialType = groupBy(
      schemaRegistry.schemas,
      "credential_type",
    );

    const resolveAuthSource = ({
      dataset_id,
      id,
    }: {
      dataset_id: string;
      id: string;
    }): ApiAuthenticSource => {
      const as = authSourcesById.get(id);
      assert(as, `AS ${id} must be present in the Authentic Source Registry`);
      const { ipa_code, organization_name_l10n_id, ...rest } =
        as.organization_info;
      const dataCapability = as.data_capabilities.find(
        (dc) => dc.dataset_id === dataset_id,
      );
      return {
        id,
        organization_code: ipa_code,
        organization_name_l10n_id,
        user_information_l10n_id: dataCapability?.user_information_l10n_id,
        ...rest,
      };
    };

    const resolveFormats = (credentialType: string): ApiCredentialFormat[] => {
      const schemas = schemasByCredentialType.get(credentialType);
      assert(
        schemas,
        `Schemas for ${credentialType} must be present in the Schema Registry`,
      );
      return schemas.map((schema) => ({
        configuration_id: schema.id, // TODO: [SIW-3978] Fix this, the schema ID does not correspond to configuration_id
        ...schema,
      }));
    };

    return {
      ...catalogueJwt.payload,
      as_localization: authSourceRegistry.localization,
      credentials: catalogueJwt.payload.credentials.map(
        ({ authentic_sources, credential_name_l10n_id, ...credential }) => ({
          authentic_sources: authentic_sources
            ? authentic_sources.map(resolveAuthSource)
            : [],
          formats: resolveFormats(credential.credential_type),
          name_l10n_id: credential_name_l10n_id,
          ...credential,
        }),
      ),
      localization: catalogueJwt.payload.localization,
      taxonomy: {
        description_l10n_id: taxonomyRegistry.description_l10n_id,
        domains: taxonomyRegistry.domains,
        id: taxonomyRegistry.id,
        localization: taxonomyRegistry.localization,
        name_l10n_id: taxonomyRegistry.name_l10n_id,
        purposes: taxonomyRegistry.purposes,
      },
      taxonomy_uri: discoveryJwt.payload.endpoints.taxonomy,
    };
  },
  {
    outputSchema: DigitalCredentialsCatalogue,
  },
);
