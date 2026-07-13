import type { DigitalCredentialsCatalogue } from "../../api/DigitalCredentialsCatalogue";
import type {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
  TaxonomyRegistry,
} from "../types";

import { mapToCredentialsCatalogue } from "../mappers";

describe("mapToCredentialsCatalogue", () => {
  const registryDiscovery: RegistryDiscoveryJwt = {
    header: {
      alg: "ES256",
      kid: "kid-1",
      typ: "JOSE",
    },
    payload: {
      endpoints: {
        taxonomy: "https://issuer-example.com/taxonomy.json",
      } as RegistryDiscoveryJwt["payload"]["endpoints"],
      last_updated: "",
      registry_version: "1.3",
    },
  };

  const schemaRegistry: SchemaRegistry = {
    last_modified: "2026-02-25T15:03:53.134Z",
    schemas: [
      {
        credential_type: "education_attendance",
        format: "dc+sd-jwt",
        id: "dc_sd_jwt_education_attendance",
        schema_uri:
          "https://issuer-example.com/.well-known/schemas/education_attendance",
        "schema_uri#integrity": "x",
        vct: "https://issuer-example.com/vct/education_attendance",
        version: "1.3",
      },
      {
        credential_type: "av",
        docType: "eu.europa.ec.av.1",
        format: "mso_mdoc",
        id: "av+mso_mdoc+eu.europa.ec.av.1",
        schema_uri: "https://issuer-example.com/schemas/v1.3.3/av.cddl",
        "schema_uri#integrity": "y",
        version: "1.3",
      },
    ],
    version: "1.3",
  };

  const authSourceRegistry: AuthenticSourceRegistry = {
    authentic_sources: [
      {
        data_capabilities: [
          {
            available_claims: [],
            data_origin_l10n_id: "source_dataorigin.name",
            dataset_id: "dataset-1",
            integration_method: "",
            intended_purposes: [],
            user_information_l10n_id: "source_userinfo.name",
          },
        ],
        entity_id: "source-1",
        organization_info: {
          contacts: ["info@source-org.example.com"],
          homepage_uri: "https://source-org.example.com",
          ipa_code: "SRC123",
          legal_identifier: "01234567890",
          organization_country: "IT",
          organization_name_l10n_id: "source_org.name",
          organization_type: "public",
          policy_uri: "https://source-org.example.com/privacy",
        },
      },
    ],
    last_modified: "2026-02-25T15:03:53.134Z",
    version: "1.3",
  };

  const taxonomyRegistry: TaxonomyRegistry = {
    description_l10n_id: "taxonomy.description",
    domains: [
      {
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
        description_l10n_id: "domain.identity.description",
        id: "IDENTITY",
        name_l10n_id: "domain.identity.name",
      },
      {
        classes: [
          {
            id: "LICENSES_AUTHORIZATIONS",
            name_l10n_id: "class.licenses_authorizations.name",
            supported_purposes: ["DRIVING_RIGHTS_VERIFICATION"],
          },
        ],
        description_l10n_id: "domain.authorization.description",
        id: "AUTHORIZATION",
        name_l10n_id: "domain.authorization.name",
      },
    ],
    id: "urn:taxonomy:it-wallet",
    last_modified: "2026-03-11T00:00:00Z",
    localization: {
      available_locales: ["it", "en"],
      base_uri:
        "https://trust-registry.eid-wallet.example.it/.well-known/l10n/taxonomy/",
      default_locale: "it",
      version: "1.0.0",
    },
    name_l10n_id: "taxonomy.name",
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
    version: "1.0.0",
  };

  const credentialsCatalogueJwt: DigitalCredentialsCatalogueJwt = {
    header: {
      alg: "ES256",
      kid: "kid-1",
      typ: "JOSE",
    },
    payload: {
      credentials: [
        {
          authentic_sources: [
            {
              dataset_id: "dataset-1",
              id: "source-1",
            },
          ],
          authentication: {
            min_loa: "high",
            supported_schemes: ["it_wallet"],
            user_auth_required: true,
          },
          credential_name_l10n_id: "education_attendance.name",
          credential_type: "education_attendance",
          issuers: [
            {
              id: "issuer-1",
              organization_code: "ORG123",
              organization_country: "IT",
              organization_name_l10n_id: "Issuer Org",
            },
          ],
          legal_type: "pub-eaa",
          purposes: ["EDUCATION_ATTENDANCE_VERIFICATION"],
          validity_info: {
            allowed_states: [
              {
                "0x00": "VALID",
                description_l10n_id: "education_attendance.VALID.description",
                title_l10n_id: "education_attendance.VALID.title",
              },
            ],
            max_validity_days: 365,
            status_methods: ["status_list"],
          },
          version: "1.3",
        },
        {
          authentication: {
            min_loa: "substantial",
            supported_schemes: ["it_wallet"],
            user_auth_required: true,
          },
          classes: ["IDENTIFICATION_DOCUMENTS"],
          credential_name_l10n_id: "av.name",
          credential_type: "av",
          domains: ["IDENTITY"],
          issuers: [
            {
              id: "issuer-1",
              organization_code: "ORG123",
              organization_country: "IT",
              organization_name_l10n_id: "org123.organization_name",
            },
          ],
          legal_type: "pub-eaa",
          parent_credentials: ["pid"], // Credential without Authentic Source
          purposes: ["AGE_VERIFICATION"],
          validity_info: {
            administrative_expiration_user_info: {
              description_l10n_id:
                "av.administrative_expiration_user_info.description",
              title_l10n_id: "av.administrative_expiration_user_info.title",
            },
            allowed_states: [
              {
                "0x00": "VALID",
                description_l10n_id: "av.VALID.description",
                title_l10n_id: "av.VALID.title",
              },
            ],
            max_validity_days: 90,
            status_methods: ["status_list"],
          },
          version: "1",
        },
      ],
      exp: 1730003600,
      iat: 1730000000,
      id: "urn:credential-catalog:it-wallet",
      iss: "https://ta.example.com",
      last_modified: "2026-02-25T15:03:53.134Z",
      version: "1.3",
    },
  };

  const expected: DigitalCredentialsCatalogue = {
    credentials: [
      {
        authentic_sources: [
          {
            contacts: ["info@source-org.example.com"],
            homepage_uri: "https://source-org.example.com",
            id: "source-1",
            organization_code: "SRC123",
            organization_country: "IT",
            organization_name_l10n_id: "source_org.name",
            organization_type: "public",
            user_information_l10n_id: "source_userinfo.name",
          },
        ],
        credential_type: "education_attendance",
        formats: [
          {
            configuration_id: "dc_sd_jwt_education_attendance",
            format: "dc+sd-jwt",
            schema_uri:
              "https://issuer-example.com/.well-known/schemas/education_attendance",
            "schema_uri#integrity": "x",
            vct: "https://issuer-example.com/vct/education_attendance",
          },
        ],
        issuers: [
          {
            id: "issuer-1",
            organization_code: "ORG123",
            organization_country: "IT",
            organization_name_l10n_id: "Issuer Org",
          },
        ],
        legal_type: "pub-eaa",
        name_l10n_id: "education_attendance.name",
        purposes: ["EDUCATION_ATTENDANCE_VERIFICATION"],
        validity_info: {
          allowed_states: [
            {
              "0x00": "VALID",
              description_l10n_id: "education_attendance.VALID.description",
              title_l10n_id: "education_attendance.VALID.title",
            },
          ],
          max_validity_days: 365,
          status_methods: ["status_list"],
        },
        version: "1.3",
      },
      {
        authentic_sources: [],
        classes: ["IDENTIFICATION_DOCUMENTS"],
        credential_type: "av",
        domains: ["IDENTITY"],
        formats: [
          {
            configuration_id: "av+mso_mdoc+eu.europa.ec.av.1",
            docType: "eu.europa.ec.av.1",
            format: "mso_mdoc",
            schema_uri: "https://issuer-example.com/schemas/v1.3.3/av.cddl",
            "schema_uri#integrity": "y",
          },
        ],
        issuers: [
          {
            id: "issuer-1",
            organization_code: "ORG123",
            organization_country: "IT",
            organization_name_l10n_id: "org123.organization_name",
          },
        ],
        legal_type: "pub-eaa",
        name_l10n_id: "av.name",
        parent_credentials: ["pid"],
        purposes: ["AGE_VERIFICATION"],
        validity_info: {
          administrative_expiration_user_info: {
            description_l10n_id:
              "av.administrative_expiration_user_info.description",
            title_l10n_id: "av.administrative_expiration_user_info.title",
          },
          allowed_states: [
            {
              "0x00": "VALID",
              description_l10n_id: "av.VALID.description",
              title_l10n_id: "av.VALID.title",
            },
          ],
          max_validity_days: 90,
          status_methods: ["status_list"],
        },
        version: "1",
      },
    ],
    exp: 1730003600,
    iat: 1730000000,
    taxonomy: {
      description_l10n_id: "taxonomy.description",
      domains: [
        {
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
          description_l10n_id: "domain.identity.description",
          id: "IDENTITY",
          name_l10n_id: "domain.identity.name",
        },
        {
          classes: [
            {
              id: "LICENSES_AUTHORIZATIONS",
              name_l10n_id: "class.licenses_authorizations.name",
              supported_purposes: ["DRIVING_RIGHTS_VERIFICATION"],
            },
          ],
          description_l10n_id: "domain.authorization.description",
          id: "AUTHORIZATION",
          name_l10n_id: "domain.authorization.name",
        },
      ],
      id: "urn:taxonomy:it-wallet",
      localization: {
        available_locales: ["it", "en"],
        base_uri:
          "https://trust-registry.eid-wallet.example.it/.well-known/l10n/taxonomy/",
        default_locale: "it",
        version: "1.0.0",
      },
      name_l10n_id: "taxonomy.name",
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
    taxonomy_uri: "https://issuer-example.com/taxonomy.json",
  };

  it("maps types correctly", () => {
    expect(
      mapToCredentialsCatalogue([
        registryDiscovery,
        credentialsCatalogueJwt,
        authSourceRegistry,
        schemaRegistry,
        taxonomyRegistry,
      ]),
    ).toEqual(expected);
  });
});
