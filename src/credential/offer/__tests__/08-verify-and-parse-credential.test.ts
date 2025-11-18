import { parseCredentialSdJwt } from "../08-verify-and-parse-credential";
import type { SdJwtDecoded } from "../types";

describe("parseCredentialSdJwt - eu.europa.ec.eudi.pid_vc_sd_jwt", () => {
  it("parsa correttamente la credential di esempio", () => {
    const decoded = {
      jwt: {
        header: {
          alg: "ES256",
          typ: "dc+sd-jwt",
        },
        payload: {
          iss: "https://backend.issuer.eudiw.dev",
          iat: 1763424000,
          exp: 1771200000,
          vct: "urn:eudi:pid:1",
          _sd_alg: "sha-256",
          _sd: [
            "3amawGxsK4HY9DNwVX7Bmwm5_R8azwWV_aHceE8LcUQ",
            "7fgdvTEzSlDlbL_7w99SRFPnsxrAuJwKvYqCpbiuoUU",
            "BSV4a_V6Y5k5AXlQ3fOo_yQX8gvssYMwrO5BTtUyU9E",
            "I71ZQ6IO1gCbneeh97rn9UEDgv-8Noh-QK7wKj8N0rQ",
            "OlNJHDEO8BE-YUJQI9t2SCjAbeFMmqYb5W3RKgL9WSk",
            "STgykq_fF5SZKy0EJ_TSo5u9z9nSJdaTn-D0wT-p88Y",
            "TV7nQ9xDSrN4GbH2WsZI7hPRNHoLcOxPNysuWnSHVSU",
            "a3FXqarRYciZLnHAZOKAqSMAyNu-gYI3tFGMxPVTW6M",
            "tBE3FzQzGu8k8eSa78ijrEki5kaJQGSbgtwTLWW7WUI",
          ],
        },
      },

      disclosures: [
        {
          salt: "5c9RWCxQyT3JCu2F2ZnaIQ",
          key: "family_name",
          value: "Test",
          _digest: "STgykq_fF5SZKy0EJ_TSo5u9z9nSJdaTn-D0wT-p88Y",
        },
        {
          salt: "m4DFo5TESlMVFyYaxtwl4g",
          key: "given_name",
          value: "Test",
          _digest: "a3FXqarRYciZLnHAZOKAqSMAyNu-gYI3tFGMxPVTW6M",
        },
        {
          salt: "ziBk40T0XoV70S87-Aewwg",
          key: "birthdate",
          value: "2025-11-18",
          _digest: "tBE3FzQzGu8k8eSa78ijrEki5kaJQGSbgtwTLWW7WUI",
        },
        {
          salt: "V98LAj8zfiTL5Ozb7k5mzQ",
          key: "country",
          value: "Italy",
          _digest: "2B_lCw987cw3Gv553Gm7Vh-3Er4cexnDrIu0GNfh9Dg",
        },
        {
          salt: "YSFewI2PM3TaGE88jxCFXA",
          key: "locality",
          value: "Roma",
          _digest: "SsC_4u9kfGM4nKqKVOdBbIiGvGm4XS3dr0wq1HAz57o",
        },
        {
          salt: "2C4YVlhGDx_d2RrTYJlDxA",
          key: "region",
          value: "Lazio",
          _digest: "AMHx4Ibl-2Hfwec4740twsR1hP6tFivAqrOx618AWD8",
        },
        {
          salt: "1y-6ybBT3n2aHbULwV2qdQ",
          key: "place_of_birth",
          value: {
            _sd: [
              "2B_lCw987cw3Gv553Gm7Vh-3Er4cexnDrIu0GNfh9Dg",
              "AMHx4Ibl-2Hfwec4740twsR1hP6tFivAqrOx618AWD8",
              "SsC_4u9kfGM4nKqKVOdBbIiGvGm4XS3dr0wq1HAz57o",
            ],
          },
          _digest: "I71ZQ6IO1gCbneeh97rn9UEDgv-8Noh-QK7wKj8N0rQ",
        },
        {
          salt: "WdhkfI2MI7vhJz5TJWfVYA",
          value: "IT",
          _digest: "05UFZvQeQ6Q7kXxvdJvwtVjNPvSqqnULoA__gNZyzxk",
        },
        {
          salt: "dMlpg_0UqiiZ7473ck6I3Q",
          key: "nationalities",
          value: [{ "...": "05UFZvQeQ6Q7kXxvdJvwtVjNPvSqqnULoA__gNZyzxk" }],
          _digest: "7fgdvTEzSlDlbL_7w99SRFPnsxrAuJwKvYqCpbiuoUU",
        },
        {
          salt: "maew74hSSp13YFrXAxI7pA",
          key: "date_of_issuance",
          value: "2025-11-18",
          _digest: "TV7nQ9xDSrN4GbH2WsZI7hPRNHoLcOxPNysuWnSHVSU",
        },
        {
          salt: "Y-UOhOWxJGLAcN3AkglpEQ",
          key: "date_of_expiry",
          value: "2026-02-16",
          _digest: "BSV4a_V6Y5k5AXlQ3fOo_yQX8gvssYMwrO5BTtUyU9E",
        },
        {
          salt: "Tmhrja9OdTvdnu2xxZsnng",
          key: "issuing_authority",
          value: "Test PID issuer",
          _digest: "3amawGxsK4HY9DNwVX7Bmwm5_R8azwWV_aHceE8LcUQ",
        },
        {
          salt: "2olXyNz4Xocv3zMsxNI_rA",
          key: "issuing_country",
          value: "FC",
          _digest: "OlNJHDEO8BE-YUJQI9t2SCjAbeFMmqYb5W3RKgL9WSk",
        },
      ],
    } as SdJwtDecoded;

    const expectedParsed = {
      family_name: {
        value: "Test",
        name: { en: "Family Name(s)" },
      },

      given_name: {
        value: "Test",
        name: { en: "Given Name(s)" },
      },

      birthdate: {
        value: "2025-11-18",
        name: { en: "Birth Date" },
      },

      place_of_birth: {
        value: {
          country: "Italy",
          region: "Lazio",
          locality: "Roma",
        },
        name: { en: "Birth Place" },
      },

      nationalities: {
        value: ["IT"],
        name: { en: "Nationalities" },
      },

      date_of_issuance: {
        value: "2025-11-18",
        name: { en: "Issuance Date" },
      },

      date_of_expiry: {
        value: "2026-02-16",
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

    const parsed = parseCredentialSdJwt(credentialConfig, decoded);

    expect(parsed).toEqual(expectedParsed);
  });
});
