import * as z from "zod";

import { UnixTime } from "../../utils/zod";

export const LocalizationInfo = z.object({
  available_locales: z.array(z.string()),
  base_uri: z.string(),
  default_locale: z.string(),
  version: z.string(),
});
/**
 * Merged translations for one or more locales, keyed by locale code.
 * Each locale maps l10n_id keys to their translated string values.
 */
export type CatalogueTranslations = Record<string, Record<string, string>>;

export type LocalizationInfo = z.infer<typeof LocalizationInfo>;

const AdministrativeExpirationUserInfo = z.object({
  description_l10n_id: z.string(),
  title_l10n_id: z.string(),
});

export const AllowedState = z
  .object({
    description_l10n_id: z.string(),
    title_l10n_id: z.string(),
  })
  .catchall(z.string());

export type AllowedState = z.infer<typeof AllowedState>;

const CredentialPurpose = z.object({
  claim_recommended: z.array(z.string()).optional(),
  claims_required: z.array(z.string()).optional(),
  description: z.string().optional(),
  id: z.string(),
});

const CredentialIssuer = z.object({
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  id: z.string(),
  issuance_flows: z.object({ deferred_flow: z.boolean() }).optional(),
  legal_type: z.string().optional(),
  logo_uri: z.string().optional(),
  organization_code: z.string(),
  organization_country: z.string(),
  organization_name: z.string().optional(),
  organization_name_l10n_id: z.string().optional(),
  policy_uri: z.string().optional(),
  service_documentation: z.string().optional(),
  tos_uri: z.string().optional(),
});

const AuthenticSource = z.object({
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  id: z.string(),
  logo_uri: z.string().optional(),
  organization_code: z.string().optional(),
  organization_country: z.string(),
  organization_name: z.string().optional(),
  organization_name_l10n_id: z.string().optional(),
  organization_type: z.string(),
  user_information: z.string().optional(),
  user_information_l10n_id: z.string().optional(),
});
export type AuthenticSource = z.infer<typeof AuthenticSource>;

export const CredentialFormat = z.object({
  configuration_id: z.string(),
  docType: z.string().optional(),
  format: z.enum(["dc+sd-jwt", "mso_mdoc"]),
  schema_uri: z.string().url().optional(),
  "schema_uri#integrity": z.string().optional(),
  vct: z.string().url().optional(),
});
export type CredentialFormat = z.infer<typeof CredentialFormat>;

export const Claim = z.object({
  display_name: z.string(),
  name: z.string(),
  taxonomy_ref: z.string(),
});

/**
 * Unified shape for a Digital Credential in the catalogue, regardless of IT-Wallet version.
 * Please note that some of the version-specific properties might be missing in this representation.
 */
export const DigitalCredential = z.object({
  administrative_expiration_user_info:
    AdministrativeExpirationUserInfo.optional(),
  authentic_sources: z.array(AuthenticSource),
  classes: z.array(z.string()).optional(),
  credential_type: z.string(),
  description: z.string().optional(),
  domains: z.array(z.string()).optional(),
  formats: z.array(CredentialFormat).optional(),
  issuers: z.array(CredentialIssuer),
  legal_type: z.string(),
  name: z.string().optional(),
  name_l10n_id: z.string().optional(),
  parent_credentials: z.array(z.string()).optional(),
  purposes: z.array(z.union([z.string(), CredentialPurpose])),
  restriction_policy: z
    .object({
      presentation_flows: z.object({
        proximity: z.boolean(),
        remote: z.boolean(),
      }),
    })
    .optional(),
  validity_info: z.object({
    administrative_expiration_user_info:
      AdministrativeExpirationUserInfo.optional(),
    allowed_states: z.array(z.union([z.string(), AllowedState])),
    max_validity_days: z.number(),
    status_methods: z.array(z.string()),
  }),
  version: z.string(),
  // claims: z.array(Claim), // TODO: [SIW-3978] Should we keep claims?
});
export type DigitalCredential = z.infer<typeof DigitalCredential>;

const TaxonomyPurpose = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
});
export type TaxonomyPurpose = z.infer<typeof TaxonomyPurpose>;

const TaxonomyClass = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
  supported_purposes: z.array(z.string()),
});
export type TaxonomyClass = z.infer<typeof TaxonomyClass>;

const TaxonomyDomain = z.object({
  classes: z.array(TaxonomyClass),
  description_l10n_id: z.string(),
  id: z.string(),
  name_l10n_id: z.string(),
});
export type TaxonomyDomain = z.infer<typeof TaxonomyDomain>;

export const Taxonomy = z.object({
  description_l10n_id: z.string(),
  domains: z.array(TaxonomyDomain),
  id: z.string(),
  localization: LocalizationInfo.optional(),
  name_l10n_id: z.string(),
  purposes: z.array(TaxonomyPurpose),
});
export type Taxonomy = z.infer<typeof Taxonomy>;

export const DigitalCredentialsCatalogue = z.object({
  as_localization: LocalizationInfo.optional(),
  credentials: z.array(DigitalCredential),
  exp: UnixTime,
  iat: UnixTime,
  localization: LocalizationInfo.optional(),
  taxonomy: Taxonomy.optional(),
  taxonomy_uri: z.string().url(),
});
export type DigitalCredentialsCatalogue = z.infer<
  typeof DigitalCredentialsCatalogue
>;
