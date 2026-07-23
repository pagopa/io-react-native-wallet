import * as z from "zod";

import { UnixTime } from "../../utils/zod";

const ASDataCapability = z.object({
  // optional per spec (api_specification required in spec but absent in actual responses)
  api_specification: z.string().optional(),
  available_claims: z.array(
    z.object({
      claim_name: z.string(),
      mandatory: z.boolean(),
      order: z.number(),
    }),
  ),
  background_color: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  data_origin_l10n_id: z.string(),
  data_provision: z
    .object({
      deferred_flow: z.boolean(),
      immediate_flow: z.boolean(),
    })
    .optional(),
  // required per spec
  dataset_id: z.string(),
  domains: z.array(z.string()).optional(),
  integration_endpoint: z.string().optional(),
  integration_method: z.string(),
  intended_purposes: z.array(z.string()),
  logo_uri: z.string().optional(),
  "logo_uri#integrity": z.string().optional(),
  service_documentation: z.string().optional(),
  update_frequency: z.string().optional(),
  user_information_l10n_id: z.string().optional(),
});

export const AuthenticSource = z.object({
  data_capabilities: z.array(ASDataCapability),
  entity_id: z.string(),
  organization_info: z.object({
    contacts: z.array(z.string()),
    dpa_contact: z.string().optional(),
    homepage_uri: z.string(),
    // conditional: required for public AS
    ipa_code: z.string().optional(),
    legal_identifier: z.string(),
    logo_extended_uri: z.string().optional(),
    "logo_extended_uri#integrity": z.string().optional(),
    // optional per spec
    logo_uri: z.string().optional(),
    "logo_uri#integrity": z.string().optional(),
    organization_country: z.string(),
    // required per spec
    organization_name_l10n_id: z.string(),
    organization_type: z.string(),
    policy_uri: z.string(),
    // conditional: required for private AS
    tos_uri: z.string().optional(),
  }),
});
export type AuthenticSource = z.infer<typeof AuthenticSource>;

export const Schema = z.object({
  credential_type: z.string(),
  description: z.string().optional(),
  docType: z.string().optional(),
  format: z.enum(["dc+sd-jwt", "mso_mdoc"]),
  id: z.string(),
  schema_uri: z.string(),
  "schema_uri#integrity": z.string(),
  vct: z.string().optional(),
  version: z.string(),
});
export type Schema = z.infer<typeof Schema>;

const AdministrativeExpirationUserInfo = z.object({
  description_l10n_id: z.string(),
  title_l10n_id: z.string(),
});

const AllowedState = z
  .object({
    description_l10n_id: z.string(),
    title_l10n_id: z.string(),
  })
  .catchall(z.string());

const CredentialIssuer = z.object({
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  id: z.string(),
  issuance_flows: z.object({ deferred_flow: z.boolean() }).optional(),
  legal_type: z.string().optional(),
  logo_uri: z.string().optional(),
  organization_code: z.string(),
  organization_country: z.string(),
  organization_name_l10n_id: z.string(),
  policy_uri: z.string().optional(),
  service_documentation: z.string().optional(),
  tos_uri: z.string().optional(),
});

export const DigitalCredential = z.object({
  administrative_expiration_user_info:
    AdministrativeExpirationUserInfo.optional(),
  authentic_sources: z
    .array(z.object({ dataset_id: z.string(), id: z.string() }))
    .optional(),
  authentication: z.object({
    min_loa: z.string(),
    supported_schemes: z.array(z.string()),
    user_auth_required: z.boolean(),
  }),
  classes: z.array(z.string()).optional(),
  credential_name_l10n_id: z.string(),
  credential_type: z.string(),
  domains: z.array(z.string()).optional(),
  issuers: z.array(CredentialIssuer),
  legal_type: z.string(),
  parent_credentials: z.array(z.string()).optional(),
  purposes: z.array(z.string()),
  restriction_policy: z
    .object({
      allowed_issuer_ids: z.array(z.string()).optional(),
      allowed_wallet_ids: z.array(z.string()).optional(),
      presentation_flows: z.object({
        proximity: z.boolean(),
        remote: z.boolean(),
      }),
    })
    .optional(),
  validity_info: z.object({
    administrative_expiration_user_info:
      AdministrativeExpirationUserInfo.optional(),
    allowed_states: z.array(AllowedState),
    max_validity_days: z.number(),
    status_methods: z.array(z.string()),
  }),
  version: z.string(),
});

const JwtHeader = z.object({
  alg: z.string(),
  kid: z.string(),
  typ: z.string(),
  x5c: z.array(z.string()).optional(),
});

/**
 * Schema registry, available at a dedicated endpoint.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#schema-registry
 */
export const SchemaRegistry = z.object({
  last_modified: z.string().optional(),
  last_updated: z.string().optional(),
  schemas: z.array(Schema),
  version: z.string(),
});
export type SchemaRegistry = z.infer<typeof SchemaRegistry>;

/**
 * Authentic Source registry, available at a dedicated endpoint.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#authentic-source-registry
 */
export const AuthenticSourceRegistry = z.object({
  authentic_sources: z.array(AuthenticSource),
  id: z.string().optional(),
  last_modified: z.string(),
  localization: z
    .object({
      available_locales: z.array(z.string()),
      base_uri: z.string(),
      default_locale: z.string(),
      version: z.string(),
    })
    .optional(),
  version: z.string(),
});
export type AuthenticSourceRegistry = z.infer<typeof AuthenticSourceRegistry>;

/**
 * The Digital Credentials Catalogue published by the Trust Anchor.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#digital-credentials-catalog
 */
export const DigitalCredentialsCatalogueJwt = z.object({
  header: JwtHeader,
  payload: z.object({
    credentials: z.array(DigitalCredential),
    exp: UnixTime,
    iat: UnixTime,
    id: z.string(),
    iss: z.string(),
    last_modified: z.string(),
    localization: z
      .object({
        available_locales: z.array(z.string()),
        base_uri: z.string(),
        default_locale: z.string(),
        version: z.string(),
      })
      .optional(),
    version: z.string(),
  }),
});
export type DigitalCredentialsCatalogueJwt = z.infer<
  typeof DigitalCredentialsCatalogueJwt
>;

/**
 * Registry discovery info, used to discover all the Registry Infrastructure endpoints.
 * This is the entrypoint to build the full catalogue.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#registry-discovery-endpoint
 */
const RegistryDiscoveryEndpoints = z.object({
  authentic_sources: z.string(),
  claims_registry: z.string(),
  credential_catalog: z.string(),
  federation_fetch_endpoint: z.string(),
  federation_list_endpoint: z.string(),
  federation_resolve_endpoint: z.string(),
  federation_trust_mark_status_endpoint: z.string(),
  schema_registry: z.string(),
  taxonomy: z.string(),
});

export const RegistryDiscoveryJwt = z.object({
  header: JwtHeader,
  payload: z.object({
    endpoints: RegistryDiscoveryEndpoints,
    last_updated: z.string(),
    registry_version: z.string(),
  }),
});
export type RegistryDiscoveryJwt = z.infer<typeof RegistryDiscoveryJwt>;

/**
 * Taxonomy purpose (top-level flat list).
 */
const TaxonomyPurpose = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
});

/**
 * Taxonomy class within a domain.
 */
const TaxonomyClass = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
  supported_purposes: z.array(z.string()),
});

/**
 * Taxonomy domain containing classes.
 */
const TaxonomyDomain = z.object({
  classes: z.array(TaxonomyClass),
  description_l10n_id: z.string(),
  id: z.string(),
  name_l10n_id: z.string(),
});

/**
 * Taxonomy registry, available at a dedicated endpoint.
 * Provides a hierarchical classification of domains, classes, and purposes.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#taxonomy
 */
export const TaxonomyRegistry = z.object({
  description_l10n_id: z.string(),
  domains: z.array(TaxonomyDomain),
  id: z.string(),
  last_modified: z.string(),
  localization: z
    .object({
      available_locales: z.array(z.string()),
      base_uri: z.string(),
      default_locale: z.string(),
      version: z.string(),
    })
    .optional(),
  name_l10n_id: z.string(),
  purposes: z.array(TaxonomyPurpose),
  version: z.string(),
});
export type TaxonomyRegistry = z.infer<typeof TaxonomyRegistry>;
