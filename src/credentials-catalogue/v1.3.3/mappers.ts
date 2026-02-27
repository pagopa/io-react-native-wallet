import { assert } from "../../utils/misc";
import { keyBy, groupBy } from "../../utils/object";
import { createMapper } from "../../utils/mappers";
import {
  DigitalCredentialsCatalogue,
  type CredentialFormat as ApiCredentialFormat,
  type AuthenticSource as ApiAuthenticSource,
} from "../api/DigitalCredentialsCatalogue";
import {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
} from "./types";

export const mapToCredentialsCatalogue = createMapper<
  [
    RegistryDiscoveryJwt,
    DigitalCredentialsCatalogueJwt,
    AuthenticSourceRegistry,
    SchemaRegistry,
  ],
  DigitalCredentialsCatalogue
>(
  ([discoveryJwt, catalogueJwt, authSourceRegistry, schemaRegistry]) => {
    const authSourcesById = keyBy(
      authSourceRegistry.authentic_sources,
      "entity_id"
    );
    const schemasByCredentialType = groupBy(
      schemaRegistry.schemas,
      "credential_type"
    );

    const resolveAuthSource = ({
      id,
    }: {
      id: string;
      dataset_id: string;
    }): ApiAuthenticSource => {
      const as = authSourcesById[id];
      assert(as, `AS ${id} must be present in the Authentic Source Registry`);
      const { ipa_code, ...rest } = as.organization_info;
      return { id, organization_code: ipa_code, ...rest };
    };

    const resolveFormats = (credentialType: string): ApiCredentialFormat[] => {
      const schemas = schemasByCredentialType[credentialType];
      assert(
        schemas,
        `Schemas for ${credentialType} must be present in the Schema Registry`
      );
      return schemas.map((schema) => ({
        configuration_id: schema.id, // TODO: [SIW-3978] Does schema ID corresponds to configuration_id?
        ...schema,
      }));
    };

    return {
      ...catalogueJwt.payload,
      taxonomy_uri: discoveryJwt.payload.endpoints.taxonomy,
      credentials: catalogueJwt.payload.credentials.map(
        ({ authentic_sources, credential_name, ...credential }) => ({
          name: credential_name,
          formats: resolveFormats(credential.credential_type),
          authentic_sources: authentic_sources.map(resolveAuthSource),
          ...credential,
        })
      ),
    };
  },
  {
    outputSchema: DigitalCredentialsCatalogue,
  }
);
