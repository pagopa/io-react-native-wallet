import type { CryptoContext } from "@pagopa/io-react-native-jwt";

import type { IssuerConfig } from "../../api";

import { verifyAndParseCredential } from "../06-verify-and-parse-credential";
import {
  credentialCnfJwk,
  education_attendance,
  education_degree,
  education_degree_with_missing_keys,
  education_diploma,
  issuerJwk,
  mdl,
  pid,
  residency,
} from "../../../../sd-jwt/__mocks__/sd-jwt";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  decode: jest.fn().mockReturnValue({}),
  getJwkFromHeader: jest.fn().mockImplementation(
    (_, jwks) => jwks[0], // In the following tests there is always one JWK
  ),
  thumbprint: jest.fn().mockImplementation(async (jwk) => jwk.kid),
  verify: jest.fn().mockReturnValue(true),
}));

describe("verifyAndParseCredential", () => {
  const credentialCryptoContext: CryptoContext = {
    getPublicKey: async () => credentialCnfJwk,
    getSignature: async () => "",
  };

  const mockIssuerConf: IssuerConfig = {
    credential_configurations_supported: {
      mock_invalid_cred: {
        // @ts-expect-error unsupported format
        format: "unknown",
      },
      mock_valid_sd_jwt_cred: {
        claims: [
          {
            display: [
              { locale: "it-IT", name: "Nome" },
              { locale: "en-US", name: "First Name" },
            ],
            path: ["given_name"],
          },
          {
            display: [
              { locale: "it-IT", name: "Cognome" },
              { locale: "en-US", name: "Family Name" },
            ],
            path: ["family_name"],
          },
          {
            display: [
              { locale: "it-IT", name: "Data di nascita" },
              { locale: "en-US", name: "Date of birth" },
            ],
            path: ["birth_date"],
          },
          {
            display: [
              { locale: "it-IT", name: "Codice fiscale" },
              { locale: "en-US", name: "Tax ID code" },
            ],
            path: ["tax_id_code"],
          },
        ],
        display: [],
        format: "dc+sd-jwt",
        scope: "MyCredential",
        vct: "https://issuer.example.com/MyCredential",
      },
    },
    credential_endpoint: "https://issuer.example.com/credential",
    keys: [issuerJwk],
    nonce_endpoint: "https://issuer.example.com/nonce",
  };

  it("verifies and parses a valid SD-JWT credential", async () => {
    const result = await verifyAndParseCredential(
      mockIssuerConf,
      pid,
      "mock_valid_sd_jwt_cred",
      { credentialCryptoContext },
    );

    expect(result).toEqual({
      expiration: new Date(4105033200000),
      issuedAt: new Date(1771322628000),
      parsedCredential: {
        birth_date: {
          name: { "en-US": "Date of birth", "it-IT": "Data di nascita" },
          value: "1956-09-02",
        },
        family_name: {
          name: { "en-US": "Family Name", "it-IT": "Cognome" },
          value: "Lovelace",
        },
        given_name: {
          name: { "en-US": "First Name", "it-IT": "Nome" },
          value: "Ada",
        },
        tax_id_code: {
          name: { "en-US": "Tax ID code", "it-IT": "Codice fiscale" },
          value: "LVLDAA85T50G702B",
        },
      },
    });
  });

  it("throws in case of unsupported format", async () => {
    await expect(() =>
      verifyAndParseCredential(mockIssuerConf, pid, "mock_invalid_cred", {
        credentialCryptoContext,
      }),
    ).rejects.toThrow("Unsupported credential format: unknown");
  });

  it("throws in case of different holder binding", async () => {
    const altCredentialCryptoContext: CryptoContext = {
      getPublicKey: async () => ({
        alg: "ES256",
        crv: "P-256",
        kid: "ee5dece9-d4fc-4107-a854-1b7488dd9295",
        kty: "EC",
        use: "sig",
        x: "vjlLSDAhin4DA9MccvMGLwcgoSqlSYe7J5uKU2FIRIU",
        y: "mxYLuZa8J4Jj5vYfjAJ18oKg_r4axFVMcPmhMdm1Kic",
      }),
      getSignature: async () => "",
    };

    await expect(() =>
      verifyAndParseCredential(mockIssuerConf, pid, "mock_valid_sd_jwt_cred", {
        credentialCryptoContext: altCredentialCryptoContext,
      }),
    ).rejects.toThrow(
      "Failed to verify holder binding, expected kid: ee5dece9-d4fc-4107-a854-1b7488dd9295, got: eede745a-4f47-44e7-8551-50c6a1fc0bd6",
    );
  });

  it("verifies and parses a credential with nested array attributes (education_degrees)", async () => {
    const mockIssuerConfWithNested: IssuerConfig = {
      ...mockIssuerConf,
      credential_configurations_supported: {
        ...mockIssuerConf.credential_configurations_supported,
        dc_sd_jwt_education_degree: {
          claims: [
            {
              display: [
                { locale: "it-IT", name: "Codice Fiscale" },
                { locale: "en-US", name: "Tax id code" },
              ],
              path: ["tax_id_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "ID ANPR" },
                { locale: "en-US", name: "Personal Administrative Number" },
              ],
              path: ["personal_administrative_number"],
            },
            {
              display: [
                { locale: "it-IT", name: "Elenco dei titoli di studio" },
                { locale: "en-US", name: "List of education degrees" },
              ],
              path: ["education_degrees", null],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome dell'Istituto" },
                { locale: "en-US", name: "Institute name" },
              ],
              path: ["education_degrees", null, "institute_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome del titolo di studio" },
                { locale: "en-US", name: "Qualification name" },
              ],
              path: ["education_degrees", null, "qualification_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Voto del titolo di studio" },
                { locale: "en-US", name: "Qualification grade value" },
              ],
              path: ["education_degrees", null, "qualification_grade_value"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Data di conseguimento del titolo di studio",
                },
                { locale: "en-US", name: "Qualification date" },
              ],
              path: ["education_degrees", null, "academic_qualification_date"],
            },
            {
              display: [
                { locale: "it-IT", name: "Tipologia del corso di laurea" },
                { locale: "en-US", name: "Program type name" },
              ],
              path: ["education_degrees", null, "programme_type_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome della classe di laurea" },
                { locale: "en-US", name: "Degree class name" },
              ],
              path: ["education_degrees", null, "degree_class_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Codice della classe di laurea" },
                { locale: "en-US", name: "Degree class code" },
              ],
              path: ["education_degrees", null, "degree_class"],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome del corso di laurea" },
                { locale: "en-US", name: "Degree course name" },
              ],
              path: ["education_degrees", null, "degree_course_name"],
            },
          ],
          display: [],
          format: "dc+sd-jwt",
          scope: "EducationCredential",
          vct: "https://issuer.example.com/MyCredential",
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithNested,
      education_degree,
      "dc_sd_jwt_education_degree",
      {
        credentialCryptoContext,
      },
    );

    expect(result.parsedCredential).toEqual(
      expect.objectContaining({
        education_degrees: expect.objectContaining({
          name: {
            "en-US": "List of education degrees",
            "it-IT": "Elenco dei titoli di studio",
          },
          value: [
            expect.objectContaining({
              academic_qualification_date: {
                name: {
                  "en-US": "Qualification date",
                  "it-IT": "Data di conseguimento del titolo di studio",
                },
                value: "2024-01-24",
              },
              degree_class: {
                name: {
                  "en-US": "Degree class code",
                  "it-IT": "Codice della classe di laurea",
                },
                value: "5",
              },
              degree_class_name: {
                name: {
                  "en-US": "Degree class name",
                  "it-IT": "Nome della classe di laurea",
                },
                value: "Lettere",
              },
              degree_course_name: {
                name: {
                  "en-US": "Degree course name",
                  "it-IT": "Nome del corso di laurea",
                },
                value: "Lettere",
              },
              institute_name: {
                name: {
                  "en-US": "Institute name",
                  "it-IT": "Nome dell'Istituto",
                },
                value: "Università degli studi di Roma La Sapienza",
              },
              programme_type_name: {
                name: {
                  "en-US": "Program type name",
                  "it-IT": "Tipologia del corso di laurea",
                },
                value: "Laurea Magistrale (DM 270/04)",
              },
              qualification_grade_value: {
                name: {
                  "en-US": "Qualification grade value",
                  "it-IT": "Voto del titolo di studio",
                },
                value: "71/110",
              },
              qualification_name: {
                name: {
                  "en-US": "Qualification name",
                  "it-IT": "Nome del titolo di studio",
                },
                value: " Dottore Magistrale",
              },
            }),
            expect.objectContaining({
              academic_qualification_date: {
                name: {
                  "en-US": "Qualification date",
                  "it-IT": "Data di conseguimento del titolo di studio",
                },
                value: "2021-01-24",
              },
              degree_class: {
                name: {
                  "en-US": "Degree class code",
                  "it-IT": "Codice della classe di laurea",
                },
                value: "25",
              },
              degree_class_name: {
                name: {
                  "en-US": "Degree class name",
                  "it-IT": "Nome della classe di laurea",
                },
                value: "Scienze e tecnologie fisiche",
              },
              degree_course_name: {
                name: {
                  "en-US": "Degree course name",
                  "it-IT": "Nome del corso di laurea",
                },
                value: "Fisica",
              },
              institute_name: {
                name: {
                  "en-US": "Institute name",
                  "it-IT": "Nome dell'Istituto",
                },
                value: "Università degli studi di Roma La Sapienza",
              },
              programme_type_name: {
                name: {
                  "en-US": "Program type name",
                  "it-IT": "Tipologia del corso di laurea",
                },
                value: "Laurea Triennale (DM 509/99)",
              },
              qualification_grade_value: {
                name: {
                  "en-US": "Qualification grade value",
                  "it-IT": "Voto del titolo di studio",
                },
                value: "95/110",
              },
              qualification_name: {
                name: {
                  "en-US": "Qualification name",
                  "it-IT": "Nome del titolo di studio",
                },
                value: "Dottore",
              },
            }),
          ],
        }),
        personal_administrative_number: {
          name: {
            "en-US": "Personal Administrative Number",
            "it-IT": "ID ANPR",
          },
          value: "JF97265AX",
        },
        tax_id_code: {
          name: {
            "en-US": "Tax id code",
            "it-IT": "Codice Fiscale",
          },
          value: "LVLDAA85T50G702B",
        },
      }),
    );
  });

  it("verifies and parses a credential with optional claims (education_degrees)", async () => {
    const mockIssuerConfWithOptional: IssuerConfig = {
      ...mockIssuerConf,
      credential_configurations_supported: {
        ...mockIssuerConf.credential_configurations_supported,
        dc_sd_jwt_education_degree: {
          claims: [
            {
              display: [
                { locale: "it-IT", name: "Elenco dei titoli di studio" },
                { locale: "en-US", name: "List of education degrees" },
              ],
              path: ["education_degrees", null],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome dell'Istituto" },
                { locale: "en-US", name: "Institute name" },
              ],
              path: ["education_degrees", null, "institute_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome del titolo di studio" },
                { locale: "en-US", name: "Qualification name" },
              ],
              path: ["education_degrees", null, "qualification_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Voto del titolo di studio" },
                { locale: "en-US", name: "Qualification grade value" },
              ],
              path: ["education_degrees", null, "qualification_grade_value"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Data di conseguimento del titolo di studio",
                },
                { locale: "en-US", name: "Qualification date" },
              ],
              path: ["education_degrees", null, "academic_qualification_date"],
            },
            {
              display: [
                { locale: "it-IT", name: "Tipologia del corso di laurea" },
                { locale: "en-US", name: "Program type name" },
              ],
              path: ["education_degrees", null, "programme_type_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome della classe di laurea" },
                { locale: "en-US", name: "Degree class name" },
              ],
              path: ["education_degrees", null, "degree_class_name"],
            },
            {
              display: [
                { locale: "it-IT", name: "Codice della classe di laurea" },
                { locale: "en-US", name: "Degree class code" },
              ],
              path: ["education_degrees", null, "degree_class"],
            },
            {
              display: [
                { locale: "it-IT", name: "Nome del corso di laurea" },
                { locale: "en-US", name: "Degree course name" },
              ],
              path: ["education_degrees", null, "degree_course_name"],
            },
          ],
          display: [],
          format: "dc+sd-jwt",
          scope: "EducationCredential",
          vct: "https://ta.wallet.ipzs.it/schemas/v1.0.0/education_degree.json",
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithOptional,
      education_degree_with_missing_keys,
      "dc_sd_jwt_education_degree",
      {
        credentialCryptoContext,
      },
    );

    expect(result.parsedCredential).toEqual({
      education_degrees: {
        name: {
          "en-US": "List of education degrees",
          "it-IT": "Elenco dei titoli di studio",
        },
        value: [
          {
            academic_qualification_date: {
              name: {
                "en-US": "Qualification date",
                "it-IT": "Data di conseguimento del titolo di studio",
              },
              value: "2024-01-24",
            },
            degree_course_name: {
              name: {
                "en-US": "Degree course name",
                "it-IT": "Nome del corso di laurea",
              },
              value: "Lettere",
            },
            institute_name: {
              name: {
                "en-US": "Institute name",
                "it-IT": "Nome dell'Istituto",
              },
              value: "Università degli studi di Roma La Sapienza",
            },
            programme_type_name: {
              name: {
                "en-US": "Program type name",
                "it-IT": "Tipologia del corso di laurea",
              },
              value: "Laurea Magistrale (DM 270/04)",
            },
            qualification_name: {
              name: {
                "en-US": "Qualification name",
                "it-IT": "Nome del titolo di studio",
              },
              value: " Dottore Magistrale",
            },
          },
          {
            academic_qualification_date: {
              name: {
                "en-US": "Qualification date",
                "it-IT": "Data di conseguimento del titolo di studio",
              },
              value: "2021-01-24",
            },
            degree_class_name: {
              name: {
                "en-US": "Degree class name",
                "it-IT": "Nome della classe di laurea",
              },
              value: "Scienze e tecnologie fisiche",
            },
            degree_course_name: {
              name: {
                "en-US": "Degree course name",
                "it-IT": "Nome del corso di laurea",
              },
              value: "Fisica",
            },
            institute_name: {
              name: {
                "en-US": "Institute name",
                "it-IT": "Nome dell'Istituto",
              },
              value: "Università degli studi di Roma La Sapienza",
            },
            programme_type_name: {
              name: {
                "en-US": "Program type name",
                "it-IT": "Tipologia del corso di laurea",
              },
              value: "Laurea Triennale (DM 509/99)",
            },
            qualification_name: {
              name: {
                "en-US": "Qualification name",
                "it-IT": "Nome del titolo di studio",
              },
              value: "Dottore",
            },
          },
        ],
      },
    });
  });

  it("verifies and parses a credential with multiple nested attributes and missing keys", async () => {
    const mockIssuerConfWithDeepNested: IssuerConfig = {
      ...mockIssuerConf,
      credential_configurations_supported: {
        dc_sd_jwt_mDL: {
          claims: [
            {
              display: [
                { locale: "it-IT", name: "Codici" },
                { locale: "en-US", name: "Driving privileges" },
              ],
              path: ["driving_privileges", null],
            },
            {
              display: [
                { locale: "it-IT", name: "Categoria" },
                { locale: "en-US", name: "Category code" },
              ],
              path: ["driving_privileges", null, "vehicle_category_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Data rilascio categoria" },
                { locale: "en-US", name: "Category issue date" },
              ],
              path: ["driving_privileges", null, "issue_date"],
            },
            {
              display: [
                { locale: "it-IT", name: "Data di scadenza della categoria" },
                { locale: "en-US", name: "Category expiry date" },
              ],
              path: ["driving_privileges", null, "expiry_date"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Restrizioni e condizioni della categoria",
                },
                { locale: "en-US", name: "Category conditions/restrictions" },
              ],
              path: ["driving_privileges", null, "codes", null],
            },
            {
              display: [
                { locale: "it-IT", name: "Codice restrizione/condizione" },
                { locale: "en-US", name: "Condition/restriction code" },
              ],
              path: ["driving_privileges", null, "codes", null, "code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Segno restrizione/condizione" },
                { locale: "en-US", name: "Condition/restriction sign" },
              ],
              path: ["driving_privileges", null, "codes", null, "sign"],
            },
            {
              display: [
                { locale: "it-IT", name: "Valore restrizione/condizione" },
                { locale: "en-US", name: "Condition/restriction value" },
              ],
              path: ["driving_privileges", null, "codes", null, "value"],
            },
          ],
          display: [],
          format: "dc+sd-jwt",
          scope: "mDL",

          vct: "https://issuer.example.com/MyCredential",
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithDeepNested,
      mdl,
      "dc_sd_jwt_mDL",
      { credentialCryptoContext },
    );

    expect(result.parsedCredential).toEqual({
      driving_privileges: {
        name: { "en-US": "Driving privileges", "it-IT": "Codici" },
        value: [
          {
            expiry_date: {
              name: {
                "en-US": "Category expiry date",
                "it-IT": "Data di scadenza della categoria",
              },
              value: "2032-09-02",
            },
            issue_date: {
              name: {
                "en-US": "Category issue date",
                "it-IT": "Data rilascio categoria",
              },
              value: "2015-08-19",
            },
            vehicle_category_code: {
              name: { "en-US": "Category code", "it-IT": "Categoria" },
              value: "AM",
            },
          },
          {
            codes: {
              name: {
                "en-US": "Category conditions/restrictions",
                "it-IT": "Restrizioni e condizioni della categoria",
              },
              value: [
                {
                  code: {
                    name: {
                      "en-US": "Condition/restriction code",
                      "it-IT": "Codice restrizione/condizione",
                    },
                    value: "01",
                  },
                  sign: {
                    name: {
                      "en-US": "Condition/restriction sign",
                      "it-IT": "Segno restrizione/condizione",
                    },
                    value: "02",
                  },
                  value: {
                    name: {
                      "en-US": "Condition/restriction value",
                      "it-IT": "Valore restrizione/condizione",
                    },
                    value: "Guida con lenti",
                  },
                },
              ],
            },
            expiry_date: {
              name: {
                "en-US": "Category expiry date",
                "it-IT": "Data di scadenza della categoria",
              },
              value: "2033-04-17",
            },
            issue_date: {
              name: {
                "en-US": "Category issue date",
                "it-IT": "Data rilascio categoria",
              },
              value: "2015-07-11",
            },
            vehicle_category_code: {
              name: { "en-US": "Category code", "it-IT": "Categoria" },
              value: "B",
            },
          },
        ],
      },
    });
  });

  it("verifies and parses a credential with nested object attributes (residency)", async () => {
    const mockIssuerConfWithNested: IssuerConfig = {
      ...mockIssuerConf,
      credential_configurations_supported: {
        ...mockIssuerConf.credential_configurations_supported,
        dc_sd_jwt_residency: {
          claims: [
            {
              display: [
                { locale: "it-IT", name: "Codice Fiscale" },
                { locale: "en-US", name: "Tax id code" },
              ],
              path: ["tax_id_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "ID ANPR" },
                { locale: "en-US", name: "Personal Administrative Number" },
              ],
              path: ["personal_administrative_number"],
            },
            {
              display: [
                { locale: "it-IT", name: "Data di nascita" },
                { locale: "en-US", name: "Date of birth" },
              ],
              path: ["birth_date"],
            },
            {
              display: [
                { locale: "it-IT", name: "Indirizzo" },
                { locale: "en-US", name: "Address" },
              ],
              path: ["address"],
            },
            {
              display: [
                { locale: "it-IT", name: "Località" },
                { locale: "en-US", name: "Locality" },
              ],
              path: ["address", "locality"],
            },
            {
              display: [
                { locale: "it-IT", name: "Frazione" },
                { locale: "en-US", name: "Locality fraction" },
              ],
              path: ["address", "locality_fraction"],
            },
            {
              display: [
                { locale: "it-IT", name: "Regione" },
                { locale: "en-US", name: "Region" },
              ],
              path: ["address", "region"],
            },
            {
              display: [
                { locale: "it-IT", name: "CAP" },
                { locale: "en-US", name: "Postal Code" },
              ],
              path: ["address", "postal_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Paese" },
                { locale: "en-US", name: "Country" },
              ],
              path: ["address", "country"],
            },
          ],
          display: [],
          format: "dc+sd-jwt",
          scope: "Residency",
          vct: "https://issuer.example.com/MyCredential",
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithNested,
      residency,
      "dc_sd_jwt_residency",
      {
        credentialCryptoContext,
      },
    );

    expect(result.parsedCredential).toEqual(
      expect.objectContaining({
        address: {
          name: {
            "en-US": "Address",
            "it-IT": "Indirizzo",
          },
          value: expect.objectContaining({
            locality: {
              name: {
                "en-US": "Locality",
                "it-IT": "Località",
              },
              value: "PAVULLO NEL FRIGNANO",
            },
            postal_code: {
              name: {
                "en-US": "Postal Code",
                "it-IT": "CAP",
              },
              value: "00100",
            },
            region: {
              name: {
                "en-US": "Region",
                "it-IT": "Regione",
              },
              value: "MO",
            },
          }),
        },
        birth_date: {
          name: {
            "en-US": "Date of birth",
            "it-IT": "Data di nascita",
          },
          value: "1956-09-02",
        },
        personal_administrative_number: {
          name: {
            "en-US": "Personal Administrative Number",
            "it-IT": "ID ANPR",
          },
          value: "JF97265AX",
        },
        tax_id_code: {
          name: {
            "en-US": "Tax id code",
            "it-IT": "Codice Fiscale",
          },
          value: "LVLDAA85T50G702B",
        },
      }),
    );
  });

  it("verifies and parses a credential with nested array attributes (education diploma)", async () => {
    const mockIssuerConfWithNested: IssuerConfig = {
      ...mockIssuerConf,
      credential_configurations_supported: {
        ...mockIssuerConf.credential_configurations_supported,
        dc_sd_jwt_education_diploma: {
          claims: [
            {
              display: [
                { locale: "it-IT", name: "Codice Fiscale" },
                { locale: "en-US", name: "Tax id code" },
              ],
              path: ["tax_id_code"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Elenco dei titoli di studio scolastici",
                },
                { locale: "en-US", name: "List of School Qualification" },
              ],
              path: ["school_qualifications", null],
            },
            {
              display: [
                { locale: "it-IT", name: "Anno scolastico" },
                { locale: "en-US", name: "School year" },
              ],
              path: ["school_qualifications", null, "school_year"],
            },
            {
              display: [
                { locale: "it-IT", name: "Anno scolastico di conseguimento" },
                { locale: "en-US", name: "School year of achievement" },
              ],
              path: ["school_qualifications", null, "qualification_year"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Codice meccanografico dell'Istituto",
                },
                { locale: "en-US", name: "Institute identification code" },
              ],
              path: ["school_qualifications", null, "institute_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Denominazione dell'Istituto" },
                { locale: "en-US", name: "Institute Name" },
              ],
              path: ["school_qualifications", null, "institute_name"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Denominazione del Plesso Scolastico",
                },
                { locale: "en-US", name: "School Name" },
              ],
              path: ["school_qualifications", null, "school_name"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Codice meccanografico del Plesso Scolastico",
                },
                { locale: "en-US", name: "School Code" },
              ],
              path: ["school_qualifications", null, "school_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Voto finale" },
                { locale: "en-US", name: "Qualification Grade Value" },
              ],
              path: [
                "school_qualifications",
                null,
                "qualification_grade_value",
              ],
            },
            {
              display: [
                { locale: "it-IT", name: "Tipologia del titolo di studio" },
                { locale: "en-US", name: "Qualification Type" },
              ],
              path: ["school_qualifications", null, "qualification_type"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Descrizione della Tipologia del titolo di studio",
                },
                { locale: "en-US", name: "Qualification Type Description" },
              ],
              path: [
                "school_qualifications",
                null,
                "qualification_type_description",
              ],
            },
          ],
          display: [],
          format: "dc+sd-jwt",
          scope: "EducationDiploma",
          vct: "https://ta.wallet.ipzs.it/schemas/v1.0.0/education_diploma.json",
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithNested,
      education_diploma,
      "dc_sd_jwt_education_diploma",
      { credentialCryptoContext },
    );

    expect(result.parsedCredential).toEqual({
      school_qualifications: {
        name: {
          "en-US": "List of School Qualification",
          "it-IT": "Elenco dei titoli di studio scolastici",
        },
        value: [
          {
            institute_code: {
              name: {
                "en-US": "Institute identification code",
                "it-IT": "Codice meccanografico dell'Istituto",
              },
              value: "RMIC813002",
            },
            institute_name: {
              name: {
                "en-US": "Institute Name",
                "it-IT": "Denominazione dell'Istituto",
              },
              value: '"MARIA MONTESSORI"',
            },
            qualification_grade_value: {
              name: {
                "en-US": "Qualification Grade Value",
                "it-IT": "Voto finale",
              },
              value: "7",
            },
            qualification_type: {
              name: {
                "en-US": "Qualification Type",
                "it-IT": "Tipologia del titolo di studio",
              },
              value: "Diploma conclusivo del primo ciclo di istruzione",
            },
            qualification_type_description: {
              name: {
                "en-US": "Qualification Type Description",
                "it-IT": "Descrizione della Tipologia del titolo di studio",
              },
              value: "Diploma conclusivo del primo ciclo di istruzione",
            },
            qualification_year: {
              name: {
                "en-US": "School year of achievement",
                "it-IT": "Anno scolastico di conseguimento",
              },
              value: "2025",
            },
            school_code: {
              name: {
                "en-US": "School Code",
                "it-IT": "Codice meccanografico del Plesso Scolastico",
              },
              value: "RMMM813013",
            },
            school_name: {
              name: {
                "en-US": "School Name",
                "it-IT": "Denominazione del Plesso Scolastico",
              },
              value: "SANDRO PERTINI",
            },
            school_year: {
              name: { "en-US": "School year", "it-IT": "Anno scolastico" },
              value: "2024/2025",
            },
          },
        ],
      },
      tax_id_code: {
        name: { "en-US": "Tax id code", "it-IT": "Codice Fiscale" },
        value: "LVLDAA85T50G702B",
      },
    });
  });

  it("verifies and parses a credential with nested array attributes (education attendance)", async () => {
    const mockIssuerConfWithNested: IssuerConfig = {
      ...mockIssuerConf,
      credential_configurations_supported: {
        ...mockIssuerConf.credential_configurations_supported,
        dc_sd_jwt_education_attendance: {
          claims: [
            {
              display: [
                { locale: "it-IT", name: "Codice Fiscale" },
                { locale: "en-US", name: "Tax id code" },
              ],
              path: ["tax_id_code"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Codice meccanografico dell'Istituto",
                },
                { locale: "en-US", name: "Institute identification code" },
              ],
              path: ["institute_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Denominazione dell'Istituto" },
                { locale: "en-US", name: "Institute Name" },
              ],
              path: ["institute_name"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Denominazione del Plesso Scolastico",
                },
                { locale: "en-US", name: "School Name" },
              ],
              path: ["school_name"],
            },
            {
              display: [
                {
                  locale: "it-IT",
                  name: "Codice meccanografico del Plesso Scolastico",
                },
                { locale: "en-US", name: "School Code" },
              ],
              path: ["school_code"],
            },
            {
              display: [
                { locale: "it-IT", name: "Anno del corso" },
                { locale: "en-US", name: "Course year" },
              ],
              path: ["school_course_year"],
            },
            {
              display: [
                { locale: "it-IT", name: "Anno scolastico" },
                { locale: "en-US", name: "School year" },
              ],
              path: ["school_year"],
            },
            {
              display: [
                { locale: "it-IT", name: "Indirizzo di studio" },
                { locale: "en-US", name: "Educational track" },
              ],
              path: ["educational_track"],
            },
            {
              display: [
                { locale: "it-IT", name: "Tipo di frequenza" },
                { locale: "en-US", name: "Attendance type" },
              ],
              path: ["school_attendance_type"],
            },
          ],
          display: [],
          format: "dc+sd-jwt",
          scope: "EducationAttendance",
          vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/education_attendance",
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithNested,
      education_attendance,
      "dc_sd_jwt_education_attendance",
      { credentialCryptoContext },
    );

    expect(result.parsedCredential).toEqual({
      educational_track: {
        name: { "en-US": "Educational track", "it-IT": "Indirizzo di studio" },
        value: "CLASSICO",
      },
      institute_code: {
        name: {
          "en-US": "Institute identification code",
          "it-IT": "Codice meccanografico dell'Istituto",
        },
        value: "RMPC150008",
      },
      institute_name: {
        name: {
          "en-US": "Institute Name",
          "it-IT": "Denominazione dell'Istituto",
        },
        value: "LICEO GINNASIO STATALE ORAZIO",
      },
      school_attendance_type: {
        name: { "en-US": "Attendance type", "it-IT": "Tipo di frequenza" },
        value: "Frequenza - Scuola Secondaria di II Grado",
      },
      school_code: {
        name: {
          "en-US": "School Code",
          "it-IT": "Codice meccanografico del Plesso Scolastico",
        },
        value: "RMPC150008",
      },
      school_course_year: {
        name: { "en-US": "Course year", "it-IT": "Anno del corso" },
        value: "1°",
      },
      school_name: {
        name: {
          "en-US": "School Name",
          "it-IT": "Denominazione del Plesso Scolastico",
        },
        value: "LICEO GINNASIO STATALE ORAZIO",
      },
      school_year: {
        name: { "en-US": "School year", "it-IT": "Anno scolastico" },
        value: "2025/2026",
      },
      tax_id_code: {
        name: { "en-US": "Tax id code", "it-IT": "Codice Fiscale" },
        value: "LVLDAA85T50G702B",
      },
    });
  });
});
