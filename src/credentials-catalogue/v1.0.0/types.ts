import * as z from "zod";

import { UnixTime } from "../../utils/zod";

const CredentialPurpose = z.object({
  category: z.string().optional(),
  claim_recommended: z.array(z.string()),
  claims_required: z.array(z.string()),
  description: z.string(),
  id: z.string(),
  subcategory: z.string().optional(),
});

const CredentialIssuer = z.object({
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  id: z.string(),
  logo_uri: z.string().optional(),
  organization_code: z.string(),
  organization_country: z.string(),
  organization_name: z.string(),
  policy_uri: z.string().optional(),
  tos_uri: z.string().optional(),
});

const AuthenticSource = z.object({
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  id: z.string(),
  logo_uri: z.string().optional(),
  organization_code: z.string(),
  organization_country: z.string(),
  organization_name: z.string(),
  source_type: z.string(),
  user_information: z.string().optional(),
});

const CredentialFormat = z.object({
  configuration_id: z.string(),
  docType: z.string().optional(),
  format: z.enum(["dc+sd-jwt", "mso_mdoc"]),
  schema_uri: z.string().url().optional(),
  "schema_uri#integrity": z.string().optional(),
  vct: z.string().url().optional(),
});

const Claim = z.object({
  display_name: z.string(),
  name: z.string(),
  taxonomy_ref: z.string(),
});

export const DigitalCredential = z.object({
  authentic_sources: z.array(AuthenticSource),
  authentication: z.object({
    min_loa: z.string(),
    supported_eid_schemes: z.array(z.string()),
    user_auth_required: z.boolean(),
  }),
  claims: z.array(Claim),
  credential_type: z.string(),
  description: z.string(),
  formats: z.array(CredentialFormat),
  issuers: z.array(CredentialIssuer),
  legal_type: z.string(),
  name: z.string(),
  purposes: z.array(CredentialPurpose),
  validity_info: z.object({
    allowed_states: z.array(z.string()),
    max_validity_days: z.number(),
    status_methods: z.array(z.string()),
  }),
  version: z.string(),
});

/**
 * The Digital Credentials Catalogue published by the Trust Anchor
 *
 * @version 1.1.0
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.1.0/en/registry-catalogue.html
 */
export const DigitalCredentialsCatalogueJwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    typ: z.string(),
  }),
  payload: z.object({
    catalog_version: z.string(),
    credentials: z.array(DigitalCredential),
    exp: UnixTime,
    iat: UnixTime,
    taxonomy_uri: z.string().url(),
  }),
});
export type DigitalCredentialsCatalogueJwt = z.infer<
  typeof DigitalCredentialsCatalogueJwt
>;
