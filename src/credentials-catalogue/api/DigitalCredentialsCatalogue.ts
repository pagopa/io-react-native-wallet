import * as z from "zod";

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

const AuthenticSource = z.object({
  id: z.string(),
  organization_name: z.string(),
  organization_code: z.string(),
  organization_country: z.string(),
  source_type: z.string(),
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  user_information: z.string().optional(),
});

const CredentialFormat = z.object({
  configuration_id: z.string(),
  format: z.enum(["dc+sd-jwt", "mso_mdoc"]),
  vct: z.string().url().optional(),
  docType: z.string().optional(),
  schema_uri: z.string().url().optional(),
  "schema_uri#integrity": z.string().optional(),
});

const Claim = z.object({
  name: z.string(),
  taxonomy_ref: z.string(),
  display_name: z.string(),
});

/**
 * Unified shape for a Digital Credential in the catalogue, regardless of IT-Wallet version.
 * Please note that some of the version-specific properties might be missing in this representation.
 */
export const DigitalCredential = z.object({
  version: z.string(),
  credential_type: z.string(),
  legal_type: z.string(),
  name: z.string(),
  description: z.string(),
  validity_info: z.object({
    max_validity_days: z.number(),
    status_methods: z.array(z.string()),
    allowed_states: z.array(z.string()),
  }),
  purposes: z.array(CredentialPurpose),
  issuers: z.array(CredentialIssuer),
  authentic_sources: z.array(AuthenticSource),
  formats: z.array(CredentialFormat),
  claims: z.array(Claim),
});

export const DigitalCredentialsCatalogue = z.object({
  taxonomy_uri: z.string().url(),
  credentials: z.array(DigitalCredential),
  iat: z.number(),
  exp: z.number(),
});
export type DigitalCredentialsCatalogue = z.infer<
  typeof DigitalCredentialsCatalogue
>;
