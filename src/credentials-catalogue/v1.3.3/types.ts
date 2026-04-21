import * as z from "zod";
import { UnixTime } from "../../utils/zod";

const ASDataCapability = z.object({
  // required per spec
  dataset_id: z.string(),
  intended_purposes: z.array(z.string()),
  available_claims: z.array(
    z.object({
      claim_name: z.string(),
      order: z.number(),
      mandatory: z.boolean(),
    })
  ),
  domains: z.array(z.string()).optional(),
  data_origin_l10n_id: z.string(),
  integration_endpoint: z.string(),
  integration_method: z.string(),
  user_information_l10n_id: z.string(),
  // optional per spec (api_specification required in spec but absent in actual responses)
  api_specification: z.string().optional(),
  background_color: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  data_provision: z
    .object({
      deferred_flow: z.boolean(),
      immediate_flow: z.boolean(),
    })
    .optional(),
  logo_uri: z.string().optional(),
  "logo_uri#integrity": z.string().optional(),
  service_documentation: z.string().optional(),
  update_frequency: z.string().optional(),
});

export const AuthenticSource = z.object({
  entity_id: z.string(),
  organization_info: z.object({
    // required per spec
    organization_name_l10n_id: z.string(),
    organization_type: z.string(),
    organization_country: z.string(),
    legal_identifier: z.string(),
    homepage_uri: z.string(),
    contacts: z.array(z.string()),
    policy_uri: z.string(),
    // conditional: required for public AS
    ipa_code: z.string().optional(),
    // conditional: required for private AS
    tos_uri: z.string().optional(),
    // optional per spec
    logo_uri: z.string().optional(),
    "logo_uri#integrity": z.string().optional(),
    logo_extended_uri: z.string().optional(),
    "logo_extended_uri#integrity": z.string().optional(),
    dpa_contact: z.string().optional(),
  }),
  data_capabilities: z.array(ASDataCapability),
});
export type AuthenticSource = z.infer<typeof AuthenticSource>;

export const Schema = z.object({
  id: z.string(),
  version: z.string(),
  credential_type: z.string(),
  format: z.enum(["dc+sd-jwt", "mso_mdoc"]),
  docType: z.string().optional(),
  vct: z.string().optional(),
  schema_uri: z.string(),
  "schema_uri#integrity": z.string(),
  description: z.string().optional(),
});
export type Schema = z.infer<typeof Schema>;

const AdministrativeExpirationUserInfo = z.object({
  title_l10n_id: z.string(),
  description_l10n_id: z.string(),
});

const AllowedState = z
  .object({
    title_l10n_id: z.string(),
    description_l10n_id: z.string(),
  })
  .catchall(z.string());

const CredentialIssuer = z.object({
  id: z.string(),
  organization_name_l10n_id: z.string(),
  organization_code: z.string(),
  organization_country: z.string(),
  legal_type: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  policy_uri: z.string().optional(),
  tos_uri: z.string().optional(),
  service_documentation: z.string().optional(),
  issuance_flows: z.object({ deferred_flow: z.boolean() }).optional(),
});

export const DigitalCredential = z.object({
  version: z.string(),
  credential_type: z.string(),
  credential_name_l10n_id: z.string(),
  legal_type: z.string(),
  restriction_policy: z
    .object({
      allowed_wallet_ids: z.array(z.string()).optional(),
      allowed_issuer_ids: z.array(z.string()).optional(),
      presentation_flows: z.object({
        remote: z.boolean(),
        proximity: z.boolean(),
      }),
    })
    .optional(),
  validity_info: z.object({
    max_validity_days: z.number(),
    status_methods: z.array(z.string()),
    administrative_expiration_user_info:
      AdministrativeExpirationUserInfo.optional(),
    allowed_states: z.array(AllowedState),
  }),
  administrative_expiration_user_info:
    AdministrativeExpirationUserInfo.optional(),
  authentication: z.object({
    user_auth_required: z.boolean(),
    min_loa: z.string(),
    supported_schemes: z.array(z.string()),
  }),
  domains: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  purposes: z.array(z.string()),
  issuers: z.array(CredentialIssuer),
  authentic_sources: z.array(
    z.object({
      id: z.string(),
      dataset_id: z.string(),
    })
  ),
});

const JwtHeader = z.object({
  typ: z.string(),
  alg: z.string(),
  kid: z.string(),
  x5c: z.array(z.string()).optional(),
});

/**
 * Schema registry, available at a dedicated endpoint.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#schema-registry
 */
export const SchemaRegistry = z.object({
  version: z.string(),
  last_modified: z.string().optional(),
  last_updated: z.string().optional(),
  schemas: z.array(Schema),
});
export type SchemaRegistry = z.infer<typeof SchemaRegistry>;

/**
 * Authentic Source registry, available at a dedicated endpoint.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#authentic-source-registry
 */
export const AuthenticSourceRegistry = z.object({
  id: z.string().optional(),
  version: z.string(),
  last_modified: z.string(),
  localization: z
    .object({
      available_locales: z.array(z.string()),
      base_uri: z.string(),
      default_locale: z.string(),
      version: z.string(),
    })
    .optional(),
  authentic_sources: z.array(AuthenticSource),
});
export type AuthenticSourceRegistry = z.infer<typeof AuthenticSourceRegistry>;

/**
 * The Digital Credentials Catalogue published by the Trust Anchor.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#digital-credentials-catalog
 */
export const DigitalCredentialsCatalogueJwt = z.object({
  header: JwtHeader,
  payload: z.object({
    iss: z.string(),
    id: z.string(),
    version: z.string(),
    last_modified: z.string(),
    localization: z
      .object({
        available_locales: z.array(z.string()),
        base_uri: z.string(),
        default_locale: z.string(),
        version: z.string(),
      })
      .optional(),
    credentials: z.array(DigitalCredential),
    iat: UnixTime,
    exp: UnixTime,
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
  claims_registry: z.string(),
  authentic_sources: z.string(),
  credential_catalog: z.string(),
  taxonomy: z.string(),
  schema_registry: z.string(),
  federation_list_endpoint: z.string(),
  federation_fetch_endpoint: z.string(),
  federation_resolve_endpoint: z.string(),
  federation_trust_mark_status_endpoint: z.string(),
});

export const RegistryDiscoveryJwt = z.object({
  header: JwtHeader,
  payload: z.object({
    registry_version: z.string(),
    last_updated: z.string(),
    endpoints: RegistryDiscoveryEndpoints,
  }),
});
export type RegistryDiscoveryJwt = z.infer<typeof RegistryDiscoveryJwt>;
