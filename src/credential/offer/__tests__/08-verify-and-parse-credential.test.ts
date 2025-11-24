import { parseCredentialSdJwt } from "../08-verify-and-parse-credential";

describe("parseCredentialSdJwt - eu.europa.ec.eudi.pid_vc_sd_jwt", () => {
  it("parses an european PID using @sd-jwt library and a new localized parser", () => {
    const rawPayload = {
      vct: "urn:eudi:pid:1",
      iss: "https://backend.issuer.eudiw.dev",
      family_name: "Mario",
      given_name: "Rossi",
      birthdate: "2025-11-19",
      place_of_birth: {
        country: "Italy",
        region: "Lazio",
        locality: "Roma",
      },
      nationalities: ["IT"],
      address: {
        postal_code: "35010",
      },
      date_of_issuance: "2025-11-19",
      date_of_expiry: "2026-02-17",
      issuing_authority: "Test PID issuer",
      issuing_country: "FC",
      iat: 1763510400,
      exp: 1771286400,
      _sd_alg: "sha-256",
    };

    const expectedParsed = {
      family_name: {
        value: "Mario",
        name: { en: "Family Name(s)" },
      },

      given_name: {
        value: "Rossi",
        name: { en: "Given Name(s)" },
      },

      birthdate: {
        value: "2025-11-19",
        name: { en: "Birth Date" },
      },

      place_of_birth: {
        value: {
          country: {
            name: "country",
            value: "Italy",
          },
          locality: {
            name: "locality",
            value: "Roma",
          },
          region: {
            name: "region",
            value: "Lazio",
          },
        },
        name: { en: "Birth Place" },
      },

      nationalities: {
        value: ["IT"],
        name: { en: "Nationalities" },
      },

      date_of_issuance: {
        value: "2025-11-19",
        name: { en: "Issuance Date" },
      },
      address: {
        name: {
          en: "Address",
        },
        value: {
          postal_code: {
            value: "35010",
            name: {
              en: "Postal Code",
            },
          },
        },
      },
      date_of_expiry: {
        value: "2026-02-17",
        name: { en: "Expiry Date" },
      },

      issuing_authority: {
        value: "Test PID issuer",
        name: { en: "Issuance Authority" },
      },

      issuing_country: {
        value: "FC",
        name: { en: "Issuing Country" },
      },
    };

    const issuerConf = {
      credential_configurations_supported: {
        "eu.europa.ec.eudi.pid_vc_sd_jwt": {
          credential_metadata: {
            claims: [
              {
                display: [
                  {
                    locale: "en",
                    name: "Family Name(s)",
                  },
                ],
                mandatory: true,
                path: ["family_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Given Name(s)",
                  },
                ],
                mandatory: true,
                path: ["given_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Date",
                  },
                ],
                mandatory: true,
                path: ["birthdate"],
                value_type: "full-date",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Place",
                  },
                ],
                mandatory: true,
                path: ["place_of_birth"],
                value_type: "list",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Nationalities",
                  },
                ],
                mandatory: true,
                path: ["nationalities"],
                value_type: "list",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Address",
                  },
                ],
                mandatory: false,
                path: ["address"],
                value_type: "test",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Street",
                  },
                ],
                mandatory: false,
                path: ["address", "street_address"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Locality",
                  },
                ],
                mandatory: false,
                path: ["address", "locality"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Region",
                  },
                ],
                mandatory: false,
                path: ["address", "region"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Postal Code",
                  },
                ],
                mandatory: false,
                path: ["address", "postal_code"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Country",
                  },
                ],
                mandatory: false,
                path: ["address", "country"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Full Address",
                  },
                ],
                mandatory: false,
                path: ["address", "formatted"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "House Number",
                  },
                ],
                mandatory: false,
                path: ["address", "house_number"],
                value_type: "uint",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Personal Administrative Number",
                  },
                ],
                mandatory: false,
                path: ["personal_administrative_number"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Portrait Image",
                  },
                ],
                mandatory: false,
                path: ["picture"],
                value_type: "jpeg",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Family Name(s)",
                  },
                ],
                mandatory: false,
                path: ["birth_family_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Birth Given Name(s)",
                  },
                ],
                mandatory: false,
                path: ["birth_given_name"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Sex",
                  },
                ],
                mandatory: false,
                path: ["sex"],
                value_type: "uint",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Email Address",
                  },
                ],
                mandatory: false,
                path: ["email_address"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Mobile Phone Number",
                  },
                ],
                mandatory: false,
                path: ["mobile_phone_number"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuance Date",
                  },
                ],
                mandatory: true,
                path: ["date_of_issuance"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Expiry Date",
                  },
                ],
                mandatory: true,
                path: ["date_of_expiry"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuance Authority",
                  },
                ],
                mandatory: true,
                path: ["issuing_authority"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Document Number",
                  },
                ],
                mandatory: false,
                path: ["document_number"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Trust Anchor",
                  },
                ],
                mandatory: false,
                path: ["trust_anchor"],
                value_type: "string",
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuing Country",
                  },
                ],
                mandatory: true,
                path: ["issuing_country"],
              },
              {
                display: [
                  {
                    locale: "en",
                    name: "Issuing Jurisdiction",
                  },
                ],
                mandatory: false,
                path: ["issuing_jurisdiction"],
              },
            ],
            display: [
              {
                locale: "en",
                logo: {
                  alt_text: "A square figure of a PID",
                  uri: "https://examplestate.com/public/pid.png",
                },
                name: "PID (SD-JWT VC)",
              },
            ],
          },
          credential_signing_alg_values_supported: ["ES256"],
          cryptographic_binding_methods_supported: ["jwk", "cose_key"],
          format: "dc+sd-jwt",
          proof_types_supported: {
            jwt: {
              proof_signing_alg_values_supported: ["ES256"],
            },
          },
          scope: "eu.europa.ec.eudi.pid_vc_sd_jwt",
          vct: "urn:eudi:pid:1",
        },
      },
    };

    const credentialConfig =
      issuerConf.credential_configurations_supported[
        "eu.europa.ec.eudi.pid_vc_sd_jwt"
      ];

    const parsed = parseCredentialSdJwt(credentialConfig, rawPayload);

    expect(parsed).toEqual(expectedParsed);
  });
});
