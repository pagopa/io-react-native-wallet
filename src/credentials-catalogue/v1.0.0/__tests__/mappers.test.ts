import type { DigitalCredentialsCatalogue } from "../../api/DigitalCredentialsCatalogue";
import type { DigitalCredentialsCatalogueJwt } from "../types";

import { mapToCredentialsCatalogue } from "../mappers";

describe("mapToCredentialsCatalogue", () => {
  const input: DigitalCredentialsCatalogueJwt = {
    header: {
      alg: "ES256",
      kid: "kid-1",
      typ: "JOSE",
    },
    payload: {
      catalog_version: "1.0.0",
      credentials: [
        {
          authentic_sources: [
            {
              id: "source-1",
              organization_code: "SRC123",
              organization_country: "IT",
              organization_name: "Source Org",
              source_type: "public",
            },
          ],
          authentication: {
            min_loa: "high",
            supported_eid_schemes: ["it_wallet"],
            user_auth_required: true,
          },
          claims: [
            {
              display_name: "Denominazione dell'Istituto scolastico",
              name: "institute_name",
              taxonomy_ref: "EDUCATION.CERTIFICATE.institute_name",
            },
          ],
          credential_type: "education_attendance",
          description:
            "Documento digitale attestante la frequenza scolastica dello studente",
          formats: [
            {
              configuration_id: "dc_sd_jwt_education_attendance",
              format: "dc+sd-jwt",
              vct: "https://example.com/vct/education_attendance",
            },
          ],
          issuers: [
            {
              id: "issuer-1",
              organization_code: "ORG123",
              organization_country: "IT",
              organization_name: "Issuer Org",
            },
          ],
          legal_type: "pub-eaa",
          name: "Frequenza Scolastica",
          purposes: [
            {
              category: "EDUCATION",
              claim_recommended: [],
              claims_required: ["institute_name"],
              description: "Frequenza scolastica",
              id: "education_attendance",
              subcategory: "CERTIFICATE",
            },
          ],
          validity_info: {
            allowed_states: ["VALID", "INVALID"],
            max_validity_days: 365,
            status_methods: ["status_assertion"],
          },
          version: "1.0.0",
        },
      ],
      exp: 1730003600,
      iat: 1730000000,
      taxonomy_uri: "https://example.com/taxonomy.json",
    },
  };

  const expected: DigitalCredentialsCatalogue = {
    credentials: [
      {
        authentic_sources: [
          {
            id: "source-1",
            organization_code: "SRC123",
            organization_country: "IT",
            organization_name: "Source Org",
            organization_type: "public",
          },
        ],
        credential_type: "education_attendance",
        description:
          "Documento digitale attestante la frequenza scolastica dello studente",
        formats: [
          {
            configuration_id: "dc_sd_jwt_education_attendance",
            format: "dc+sd-jwt",
            vct: "https://example.com/vct/education_attendance",
          },
        ],
        issuers: [
          {
            id: "issuer-1",
            organization_code: "ORG123",
            organization_country: "IT",
            organization_name: "Issuer Org",
          },
        ],
        legal_type: "pub-eaa",
        name: "Frequenza Scolastica",
        purposes: [
          {
            claim_recommended: [],
            claims_required: ["institute_name"],
            description: "Frequenza scolastica",
            id: "education_attendance",
          },
        ],
        validity_info: {
          allowed_states: ["VALID", "INVALID"],
          max_validity_days: 365,
          status_methods: ["status_assertion"],
        },
        version: "1.0.0",
      },
    ],
    exp: 1730003600,
    iat: 1730000000,
    taxonomy_uri: "https://example.com/taxonomy.json",
  };

  it("maps types correctly", () => {
    expect(mapToCredentialsCatalogue(input)).toEqual(expected);
  });
});
