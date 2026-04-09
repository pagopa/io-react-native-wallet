import type { DigitalCredentialsCatalogue } from "../../api/DigitalCredentialsCatalogue";
import { mapToCredentialsCatalogue } from "../mappers";
import type {
  AuthenticSourceRegistry,
  DigitalCredentialsCatalogueJwt,
  RegistryDiscoveryJwt,
  SchemaRegistry,
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
          purposes: [
            {
              id: "EDUCATION_ATTENDANCE_VERIFICATION",
            },
          ],
          issuers: [
            {
              id: "issuer-1",
              organization_name: "Issuer Org",
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
    iat: 1730000000,
    exp: 1730003600,
    credentials: [
      {
        version: "1.3",
        credential_type: "education_attendance",
        legal_type: "pub-eaa",
        name: "education_attendance.name",
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
        purposes: [
          {
            id: "EDUCATION_ATTENDANCE_VERIFICATION",
          },
        ],
        issuers: [
          {
            id: "issuer-1",
            organization_name: "Issuer Org",
            organization_code: "ORG123",
            organization_country: "IT",
          },
        ],
        authentic_sources: [
          {
            id: "source-1",
            organization_name: "Source Org",
            organization_code: "SRC123",
            organization_country: "IT",
            organization_type: "public",
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
      ])
    ).toEqual(expected);
  });
});
