import * as z from "zod";
import { UnixTime } from "../../utils/zod";

const ASDataCapability = z.object({
  dataset_id: z.string(),
  domains: z.array(z.string()),
  intended_purposes: z.array(z.string()),
  available_claims: z.array(
    z.object({
      claim_name: z.string(),
      order: z.number(),
      mandatory: z.boolean(),
    })
  ),
  user_information: z.string().optional(),
});

export const AuthenticSource = z.object({
  entity_id: z.string(),
  organization_info: z.object({
    organization_name: z.string(),
    organization_type: z.string(),
    organization_country: z.string(),
    ipa_code: z.string().optional(),
    contacts: z.array(z.string()).optional(),
    homepage_uri: z.string().optional(),
    logo_uri: z.string().optional(),
    policy_uri: z.string().optional(),
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

const CredentialPurpose = z.object({
  id: z.string(),
  description: z.string(),
  claims_required: z.array(z.string()),
  claim_recommended: z.array(z.string()),
});

const CredentialIssuer = z.object({
  id: z.string(),
  organization_name: z.string(),
  organization_code: z.string(),
  organization_country: z.string(),
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  policy_uri: z.string().optional(),
  tos_uri: z.string().optional(),
});

export const DigitalCredential = z.object({
  version: z.string(),
  credential_type: z.string(),
  credential_name: z.string(),
  legal_type: z.string(),
  description: z.string(),
  validity_info: z.object({
    max_validity_days: z.number(),
    status_methods: z.array(z.string()),
    allowed_states: z.array(z.string()),
  }),
  authentication: z.object({
    user_auth_required: z.boolean(),
    min_loa: z.string(),
    supported_eid_schemes: z.array(z.string()),
  }),
  purposes: z.array(CredentialPurpose),
  issuers: z.array(CredentialIssuer),
  authentic_sources: z.array(
    z.object({
      id: z.string(),
      dataset_id: z.string(),
    })
  ),
});

const jwtHeader = z.object({
  typ: z.string(),
  alg: z.string(),
  kid: z.string(),
  x5c: z.array(z.string()).optional(),
})

/**
 * Schema registry, available under a dedicated endpoint.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#schema-registry
 */
export const SchemaRegistry = z.object({
  version: z.string(),
  last_modified: z.string(),
  schemas: z.array(Schema),
});
export type SchemaRegistry = z.infer<typeof SchemaRegistry>;

/**
 * Authentic Source registry, available under a dedicated endpoint.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#authentic-source-registry
 */
export const AuthenticSourceRegistry = z.object({
  version: z.string(),
  last_modified: z.string(),
  authentic_sources: z.array(AuthenticSource),
});
export type AuthenticSourceRegistry = z.infer<typeof AuthenticSourceRegistry>;

/**
 * The Digital Credentials Catalogue published by the Trust Anchor.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/registry.html#digital-credentials-catalog
 */
export const DigitalCredentialsCatalogueJwt = z.object({
  header: jwtHeader,
  payload: z.object({
    version: z.string(),
    last_modified: z.string(),
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
export const RegistryDiscoveryJwt = z.object({
  header: jwtHeader,
  payload: z.object({
    registry_version: z.string(),
    last_updated: z.string(),
    endpoints: z.object({
      claims_registry: z.string(),
      authentic_sources: z.string(),
      credential_catalog: z.string(),
      taxonomy: z.string(),
      schema_registry: z.string(),
      federation_list: z.string(),
      federation_fetch: z.string(),
      federation_resolve: z.string(),
      federation_trust_mark_status: z.string(),
    }),
  }),
});
export type RegistryDiscoveryJwt = z.infer<typeof RegistryDiscoveryJwt>;
