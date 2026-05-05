import * as z from "zod";
import { UnixTime } from "../../utils/zod";

export const LocalizationInfo = z.object({
  available_locales: z.array(z.string()),
  base_uri: z.string(),
  default_locale: z.string(),
  version: z.string(),
});
export type LocalizationInfo = z.infer<typeof LocalizationInfo>;

/**
 * Merged translations for one or more locales, keyed by locale code.
 * Each locale maps l10n_id keys to their translated string values.
 */
export type CatalogueTranslations = Record<string, Record<string, string>>;

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

const CredentialPurpose = z.object({
  id: z.string(),
  description: z.string().optional(),
  claims_required: z.array(z.string()).optional(),
  claim_recommended: z.array(z.string()).optional(),
});

const CredentialIssuer = z.object({
  id: z.string(),
  organization_name: z.string().optional(),
  organization_name_l10n_id: z.string().optional(),
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

const AuthenticSource = z.object({
  id: z.string(),
  organization_name: z.string().optional(),
  organization_name_l10n_id: z.string().optional(),
  organization_code: z.string().optional(),
  organization_country: z.string(),
  organization_type: z.string(),
  contacts: z.array(z.string()).optional(),
  homepage_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  user_information: z.string().optional(),
});
export type AuthenticSource = z.infer<typeof AuthenticSource>;

export const CredentialFormat = z.object({
  configuration_id: z.string(),
  format: z.enum(["dc+sd-jwt", "mso_mdoc"]),
  vct: z.string().url().optional(),
  docType: z.string().optional(),
  schema_uri: z.string().url().optional(),
  "schema_uri#integrity": z.string().optional(),
});
export type CredentialFormat = z.infer<typeof CredentialFormat>;

export const Claim = z.object({
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
  name: z.string().optional(),
  name_l10n_id: z.string().optional(),
  description: z.string().optional(),
  restriction_policy: z
    .object({
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
    allowed_states: z.array(z.union([z.string(), AllowedState])),
  }),
  administrative_expiration_user_info:
    AdministrativeExpirationUserInfo.optional(),
  domains: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  purposes: z.array(z.union([z.string(), CredentialPurpose])),
  issuers: z.array(CredentialIssuer),
  authentic_sources: z.array(AuthenticSource),
  formats: z.array(CredentialFormat).optional(),
  // claims: z.array(Claim), // TODO: [SIW-3978] Should we keep claims?
});

const TaxonomyPurpose = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
  description_l10n_id: z.string(),
});
export type TaxonomyPurpose = z.infer<typeof TaxonomyPurpose>;

const TaxonomyDomain = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
  description_l10n_id: z.string(),
  purposes: z.array(TaxonomyPurpose),
});
export type TaxonomyDomain = z.infer<typeof TaxonomyDomain>;

export const Taxonomy = z.object({
  id: z.string(),
  name_l10n_id: z.string(),
  description_l10n_id: z.string(),
  domains: z.array(TaxonomyDomain),
  localization: LocalizationInfo.optional(),
});
export type Taxonomy = z.infer<typeof Taxonomy>;

export const DigitalCredentialsCatalogue = z.object({
  taxonomy_uri: z.string().url(),
  taxonomy: Taxonomy.optional(),
  credentials: z.array(DigitalCredential),
  iat: UnixTime,
  exp: UnixTime,
  localization: LocalizationInfo.optional(),
  as_localization: LocalizationInfo.optional(),
});
export type DigitalCredentialsCatalogue = z.infer<
  typeof DigitalCredentialsCatalogue
>;
