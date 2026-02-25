import type { DigitalCredentialsCatalogue } from "../../api/DigitalCredentialsCatalogue";
import { mapToCredentialsCatalogue } from "../mappers";
import type { DigitalCredentialsCatalogueJwt } from "../types";

describe("mapToCredentialsCatalogue", () => {
  const input: DigitalCredentialsCatalogueJwt = {
    header: {
      typ: "JOSE",
      alg: "ES256",
      kid: "kid-1",
    },
    payload: {
      catalog_version: "1.0.0",
      taxonomy_uri: "https://example.com/taxonomy.json",
      iat: 1730000000,
      exp: 1730003600,
      credentials: [
        {
          version: "1.0.0",
          credential_type: "education_attendance",
          legal_type: "pub-eaa",
          name: "Frequenza Scolastica",
          description:
            "Documento digitale attestante la frequenza scolastica dello studente",
          validity_info: {
            max_validity_days: 365,
            status_methods: ["status_assertion"],
            allowed_states: ["VALID", "INVALID"],
          },
          authentication: {
            user_auth_required: true,
            min_loa: "high",
            supported_eid_schemes: ["it_wallet"],
          },
          purposes: [
            {
              id: "education_attendance",
              description: "Frequenza scolastica",
              category: "EDUCATION",
              subcategory: "CERTIFICATE",
              claims_required: ["institute_name"],
              claim_recommended: [],
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
              source_type: "public",
            },
          ],
          formats: [
            {
              configuration_id: "dc_sd_jwt_education_attendance",
              format: "dc+sd-jwt",
              vct: "https://example.com/vct/education_attendance",
            },
          ],
          claims: [
            {
              name: "institute_name",
              taxonomy_ref: "EDUCATION.CERTIFICATE.institute_name",
              display_name: "Denominazione dell'Istituto scolastico",
            },
          ],
        },
      ],
    },
  };

  const expected: DigitalCredentialsCatalogue = {
    taxonomy_uri: "https://example.com/taxonomy.json",
    iat: 1730000000,
    exp: 1730003600,
    credentials: [
      {
        version: "1.0.0",
        credential_type: "education_attendance",
        legal_type: "pub-eaa",
        name: "Frequenza Scolastica",
        description:
          "Documento digitale attestante la frequenza scolastica dello studente",
        validity_info: {
          max_validity_days: 365,
          status_methods: ["status_assertion"],
          allowed_states: ["VALID", "INVALID"],
        },
        purposes: [
          {
            id: "education_attendance",
            description: "Frequenza scolastica",
            claims_required: ["institute_name"],
            claim_recommended: [],
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
            vct: "https://example.com/vct/education_attendance",
          },
        ],
      },
    ],
  };

  it("maps types correctly", () => {
    expect(mapToCredentialsCatalogue(input)).toEqual(expected);
  });
});
