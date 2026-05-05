import type { DigitalCredentialsCatalogue } from "../../api/DigitalCredentialsCatalogue";
import { mapToCredentialsCatalogue } from "../mappers";
import type {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
  TaxonomyRegistry,
} from "../types";

describe("mapToCredentialsCatalogue", () => {
  const registryDiscovery: RegistryDiscoveryJwt = {
    header: {
      typ: "JOSE",
      alg: "ES256",
      kid: "kid-1",
    },
    payload: {
      registry_version: "1.3",
      last_updated: "",
      endpoints: {
        taxonomy: "https://issuer-example.com/taxonomy.json",
      } as RegistryDiscoveryJwt["payload"]["endpoints"],
    },
  };

  const schemaRegistry: SchemaRegistry = {
    version: "1.3",
    last_modified: "2026-02-25T15:03:53.134Z",
    schemas: [
      {
        credential_type: "education_attendance",
        id: "dc_sd_jwt_education_attendance",
        format: "dc+sd-jwt",
        vct: "https://issuer-example.com/vct/education_attendance",
        version: "1.3",
        schema_uri:
          "https://issuer-example.com/.well-known/schemas/education_attendance",
        "schema_uri#integrity": "x",
      },
    ],
  };

  const authSourceRegistry: AuthenticSourceRegistry = {
    version: "1.3",
    last_modified: "2026-02-25T15:03:53.134Z",
    authentic_sources: [
      {
        entity_id: "source-1",
        organization_info: {
          organization_name_l10n_id: "source_org.name",
          ipa_code: "SRC123",
          organization_country: "IT",
          organization_type: "public",
          legal_identifier: "01234567890",
          homepage_uri: "https://source-org.example.com",
          contacts: ["info@source-org.example.com"],
          policy_uri: "https://source-org.example.com/privacy",
        },
        data_capabilities: [],
      },
    ],
  };

  const taxonomyRegistry: TaxonomyRegistry = {
    version: "1.0.0",
    last_modified: "2026-03-11T00:00:00Z",
    id: "urn:taxonomy:it-wallet",
    localization: {
      default_locale: "it",
      available_locales: ["it", "en"],
      base_uri:
        "https://trust-registry.eid-wallet.example.it/.well-known/l10n/taxonomy/",
      version: "1.0.0",
    },
    name_l10n_id: "taxonomy.name",
    description_l10n_id: "taxonomy.description",
    domains: [
      {
        id: "IDENTITY",
        name_l10n_id: "domain.identity.name",
        description_l10n_id: "domain.identity.description",
        classes: [
          {
            id: "IDENTIFICATION_DOCUMENTS",
            name_l10n_id: "class.identification_documents.name",
            supported_purposes: [
              "IDENTITY_VERIFICATION",
              "PERSON_IDENTIFICATION",
            ],
          },
        ],
      },
      {
        id: "AUTHORIZATION",
        name_l10n_id: "domain.authorization.name",
        description_l10n_id: "domain.authorization.description",
        classes: [
          {
            id: "LICENSES_AUTHORIZATIONS",
            name_l10n_id: "class.licenses_authorizations.name",
            supported_purposes: ["DRIVING_RIGHTS_VERIFICATION"],
          },
        ],
      },
    ],
    purposes: [
      {
        id: "IDENTITY_VERIFICATION",
        name_l10n_id: "purpose.identity_verification.name",
      },
      {
        id: "PERSON_IDENTIFICATION",
        name_l10n_id: "purpose.person_identification.name",
      },
      {
        id: "DRIVING_RIGHTS_VERIFICATION",
        name_l10n_id: "purpose.driving_rights_verification.name",
      },
    ],
  };

  const credentialsCatalogueJwt: DigitalCredentialsCatalogueJwt = {
    header: {
      typ: "JOSE",
      alg: "ES256",
      kid: "kid-1",
    },
    payload: {
      iss: "https://ta.example.com",
      id: "urn:credential-catalog:it-wallet",
      version: "1.3",
      last_modified: "2026-02-25T15:03:53.134Z",
      iat: 1730000000,
      exp: 1730003600,
      credentials: [
        {
          version: "1.3",
          credential_type: "education_attendance",
          legal_type: "pub-eaa",
          credential_name_l10n_id: "education_attendance.name",
          validity_info: {
            max_validity_days: 365,
            status_methods: ["status_list"],
            allowed_states: [
              {
                "0x00": "VALID",
                title_l10n_id: "education_attendance.VALID.title",
                description_l10n_id: "education_attendance.VALID.description",
              },
            ],
          },
          authentication: {
            user_auth_required: true,
            min_loa: "high",
            supported_schemes: ["it_wallet"],
          },
          purposes: ["EDUCATION_ATTENDANCE_VERIFICATION"],
          issuers: [
            {
              id: "issuer-1",
              organization_name_l10n_id: "Issuer Org",
              organization_code: "ORG123",
              organization_country: "IT",
            },
          ],
          authentic_sources: [
            {
              id: "source-1",
              dataset_id: "dataset-1",
            },
          ],
        },
      ],
    },
  };

  const expected: DigitalCredentialsCatalogue = {
    taxonomy_uri: "https://issuer-example.com/taxonomy.json",
    taxonomy: {
      id: "urn:taxonomy:it-wallet",
      name_l10n_id: "taxonomy.name",
      description_l10n_id: "taxonomy.description",
      localization: {
        default_locale: "it",
        available_locales: ["it", "en"],
        base_uri:
          "https://trust-registry.eid-wallet.example.it/.well-known/l10n/taxonomy/",
        version: "1.0.0",
      },
      domains: [
        {
          id: "IDENTITY",
          name_l10n_id: "domain.identity.name",
          description_l10n_id: "domain.identity.description",
          classes: [
            {
              id: "IDENTIFICATION_DOCUMENTS",
              name_l10n_id: "class.identification_documents.name",
              supported_purposes: [
                "IDENTITY_VERIFICATION",
                "PERSON_IDENTIFICATION",
              ],
            },
          ],
        },
        {
          id: "AUTHORIZATION",
          name_l10n_id: "domain.authorization.name",
          description_l10n_id: "domain.authorization.description",
          classes: [
            {
              id: "LICENSES_AUTHORIZATIONS",
              name_l10n_id: "class.licenses_authorizations.name",
              supported_purposes: ["DRIVING_RIGHTS_VERIFICATION"],
            },
          ],
        },
      ],
      purposes: [
        {
          id: "IDENTITY_VERIFICATION",
          name_l10n_id: "purpose.identity_verification.name",
        },
        {
          id: "PERSON_IDENTIFICATION",
          name_l10n_id: "purpose.person_identification.name",
        },
        {
          id: "DRIVING_RIGHTS_VERIFICATION",
          name_l10n_id: "purpose.driving_rights_verification.name",
        },
      ],
    },
    iat: 1730000000,
    exp: 1730003600,
    credentials: [
      {
        version: "1.3",
        credential_type: "education_attendance",
        legal_type: "pub-eaa",
        name_l10n_id: "education_attendance.name",
        validity_info: {
          max_validity_days: 365,
          status_methods: ["status_list"],
          allowed_states: [
            {
              "0x00": "VALID",
              title_l10n_id: "education_attendance.VALID.title",
              description_l10n_id: "education_attendance.VALID.description",
            },
          ],
        },
        purposes: ["EDUCATION_ATTENDANCE_VERIFICATION"],
        issuers: [
          {
            id: "issuer-1",
            organization_name_l10n_id: "Issuer Org",
            organization_code: "ORG123",
            organization_country: "IT",
          },
        ],
        authentic_sources: [
          {
            id: "source-1",
            organization_name_l10n_id: "source_org.name",
            organization_code: "SRC123",
            organization_country: "IT",
            organization_type: "public",
            contacts: ["info@source-org.example.com"],
            homepage_uri: "https://source-org.example.com",
          },
        ],
        formats: [
          {
            configuration_id: "dc_sd_jwt_education_attendance",
            format: "dc+sd-jwt",
            vct: "https://issuer-example.com/vct/education_attendance",
            schema_uri:
              "https://issuer-example.com/.well-known/schemas/education_attendance",
            "schema_uri#integrity": "x",
          },
        ],
      },
    ],
  };

  it("maps types correctly", () => {
    expect(
      mapToCredentialsCatalogue([
        registryDiscovery,
        credentialsCatalogueJwt,
        authSourceRegistry,
        schemaRegistry,
        taxonomyRegistry,
      ])
    ).toEqual(expected);
  });
});
