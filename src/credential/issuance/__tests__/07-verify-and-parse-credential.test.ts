import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { CredentialIssuerEntityConfiguration } from "../../../trust/types";
import {
  education_degree,
  education_degree_with_missing_keys,
  mdl,
  pid,
  residency,
} from "../../../sd-jwt/__mocks__/sd-jwt";
import { verifyAndParseCredential } from "..";

type IssuerConf = CredentialIssuerEntityConfiguration["payload"]["metadata"];

describe("verifyAndParseCredential", () => {
  const credentialCryptoContext: CryptoContext = {
    getPublicKey: async () => ({
      kty: "EC",
      crv: "P-256",
      x: "0Wox7QtyPqByg35MH_XyCcnd5Le-Jm0AXHlUgDBA03Y",
      y: "eEhVvg1JPqNd3DTSa4mGDGBlwY6NP-EZbLbNFXSXwIg",
    }),
    getSignature: async () => "",
  };

  const mockIssuerConf: IssuerConf = {
    openid_credential_issuer: {
      credential_endpoint: "https://issuer.example.com/credential",
      nonce_endpoint: "https://issuer.example.com/nonce",
      jwks: {
        keys: [
          {
            kty: "EC",
            use: "sig",
            alg: "ES256",
            kid: "-F_6Uga8n3VegjY2U7YUHK1zLoaD-NPTc63RMISnLaw",
            crv: "P-256",
            x: "CoQdxuFhVn2pZQ7CmaGmezYQdEEP6wFxWU_XACxMAMA",
            y: "6ppJM8poetjY6z0IDdQHuFMbQMwgKJl7eH3_FN0taZQ",
          },
        ],
      },
      credential_configurations_supported: {
        mock_invalid_cred: {
          // @ts-expect-error unsupported format
          format: "unknown",
        },
        mock_valid_sd_jwt_cred: {
          format: "dc+sd-jwt",
          vct: "https://issuer.example.com/MyCredential",
          scope: "MyCredential",
          claims: [
            {
              path: ["given_name"],
              display: [
                { locale: "it-IT", name: "Nome" },
                { locale: "en-US", name: "First Name" },
              ],
            },
            {
              path: ["family_name"],
              display: [
                { locale: "it-IT", name: "Cognome" },
                { locale: "en-US", name: "Family Name" },
              ],
            },
            {
              path: ["birth_date"],
              display: [
                { locale: "it-IT", name: "Data di nascita" },
                { locale: "en-US", name: "Date of birth" },
              ],
            },
            {
              path: ["tax_id_code"],
              display: [
                { locale: "it-IT", name: "Codice fiscale" },
                { locale: "en-US", name: "Tax ID code" },
              ],
            },
          ],
          display: [],
          credential_signing_alg_values_supported: [],
          cryptographic_binding_methods_supported: [],
        },
      },
    },
  };

  it("verifies and parses a valid SD-JWT credential", async () => {
    const result = await verifyAndParseCredential(
      mockIssuerConf,
      pid.token,
      "mock_valid_sd_jwt_cred",
      { credentialCryptoContext }
    );

    expect(result).toEqual({
      parsedCredential: {
        given_name: {
          value: "Ada",
          name: { "it-IT": "Nome", "en-US": "First Name" },
        },
        family_name: {
          value: "Lovelace",
          name: { "it-IT": "Cognome", "en-US": "Family Name" },
        },
        birth_date: {
          value: "1985-12-10",
          name: { "it-IT": "Data di nascita", "en-US": "Date of birth" },
        },
        tax_id_code: {
          value: "TINIT-LVLDAA85T50G702B",
          name: { "it-IT": "Codice fiscale", "en-US": "Tax ID code" },
        },
      },
      expiration: new Date(1751546576000),
      issuedAt: new Date(1720010575000),
    });
  });

  it("throws in case of unsupported format", async () => {
    await expect(() =>
      verifyAndParseCredential(mockIssuerConf, pid.token, "mock_invalid_cred", {
        credentialCryptoContext,
      })
    ).rejects.toThrow("Unsupported credential format: unknown");
  });

  it("throws in case of different holder binding", async () => {
    const altCredentialCryptoContext: CryptoContext = {
      getPublicKey: async () => ({
        kty: "EC",
        use: "sig",
        alg: "ES256",
        kid: "ee5dece9-d4fc-4107-a854-1b7488dd9295",
        crv: "P-256",
        x: "vjlLSDAhin4DA9MccvMGLwcgoSqlSYe7J5uKU2FIRIU",
        y: "mxYLuZa8J4Jj5vYfjAJ18oKg_r4axFVMcPmhMdm1Kic",
      }),
      getSignature: async () => "",
    };

    await expect(() =>
      verifyAndParseCredential(
        mockIssuerConf,
        pid.token,
        "mock_valid_sd_jwt_cred",
        { credentialCryptoContext: altCredentialCryptoContext }
      )
    ).rejects.toThrow(
      "Failed to verify holder binding, expected kid: ee5dece9-d4fc-4107-a854-1b7488dd9295, got: Rv3W-EiKpvBTyk5yZxvrev-7MDB6SlzUCBo_CQjjddU"
    );
  });

  it("verifies and parses a credential with nested array attributes (education_degrees)", async () => {
    const eduCredentialCryptoContext: CryptoContext = {
      getPublicKey: async () => ({
        kty: "EC",
        crv: "P-256",
        kid: "uGonT0KmgS7yWfFsHrlC4UK4xqQUJWxo2Wrix9_03UA",
        x: "NfD3cTWC4-tmrsKP0WSYYr262huexJdQ1D1OSRvoWd0",
        y: "ciUroXK-KZLt-TpnYFpjCkeefOrurDya2AxK6GA5ANc",
      }),
      getSignature: async () => "",
    };

    const mockIssuerConfWithNested: IssuerConf = {
      ...mockIssuerConf,
      openid_credential_issuer: {
        ...mockIssuerConf.openid_credential_issuer,
        jwks: {
          keys: [
            {
              kty: "EC",
              use: "sig",
              crv: "P-256",
              kid: "HH9JY9xFA3eBp7GvQsJEfvgYXzHv4dEe8lnkxt0v0cQ",
              x: "Pm93czfLFUy8xFbWVra_JDZcOeDJ0sbp4bS0dWXAhZw",
              y: "maDVY3SuVjSoiHSD0I5_QvXcsqKzbPiciRgAN1o0Sdw",
              alg: "ES256",
            },
          ],
        },
        credential_configurations_supported: {
          ...mockIssuerConf.openid_credential_issuer
            .credential_configurations_supported,
          dc_sd_jwt_education_degree: {
            format: "dc+sd-jwt",
            vct: "https://issuer.example.com/MyCredential",
            scope: "EducationCredential",
            claims: [
              {
                path: ["tax_id_code"],
                display: [
                  { locale: "it-IT", name: "Codice Fiscale" },
                  { locale: "en-US", name: "Tax id code" },
                ],
              },
              {
                path: ["personal_administrative_number"],
                display: [
                  { locale: "it-IT", name: "ID ANPR" },
                  { locale: "en-US", name: "Personal Administrative Number" },
                ],
              },
              {
                path: ["education_degrees", null],
                display: [
                  { name: "Elenco dei titoli di studio", locale: "it-IT" },
                  { name: "List of education degrees", locale: "en-US" },
                ],
              },
              {
                path: ["education_degrees", null, "institute_name"],
                display: [
                  { locale: "it-IT", name: "Nome dell'Istituto" },
                  { locale: "en-US", name: "Institute name" },
                ],
              },
              {
                path: ["education_degrees", null, "qualification_name"],
                display: [
                  { locale: "it-IT", name: "Nome del titolo di studio" },
                  { locale: "en-US", name: "Qualification name" },
                ],
              },
              {
                path: ["education_degrees", null, "qualification_grade_value"],
                display: [
                  { locale: "it-IT", name: "Voto del titolo di studio" },
                  { locale: "en-US", name: "Qualification grade value" },
                ],
              },
              {
                path: [
                  "education_degrees",
                  null,
                  "academic_qualification_date",
                ],
                display: [
                  {
                    locale: "it-IT",
                    name: "Data di conseguimento del titolo di studio",
                  },
                  { locale: "en-US", name: "Qualification date" },
                ],
              },
              {
                path: ["education_degrees", null, "programme_type_name"],
                display: [
                  { locale: "it-IT", name: "Tipologia del corso di laurea" },
                  { locale: "en-US", name: "Program type name" },
                ],
              },
              {
                path: ["education_degrees", null, "degree_class_name"],
                display: [
                  { locale: "it-IT", name: "Nome della classe di laurea" },
                  { locale: "en-US", name: "Degree class name" },
                ],
              },
              {
                path: ["education_degrees", null, "degree_class"],
                display: [
                  { locale: "it-IT", name: "Codice della classe di laurea" },
                  { locale: "en-US", name: "Degree class code" },
                ],
              },
              {
                path: ["education_degrees", null, "degree_course_name"],
                display: [
                  { locale: "it-IT", name: "Nome del corso di laurea" },
                  { locale: "en-US", name: "Degree course name" },
                ],
              },
            ],
            display: [],
            credential_signing_alg_values_supported: ["ES256"],
            cryptographic_binding_methods_supported: [],
          },
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithNested,
      education_degree,
      "dc_sd_jwt_education_degree",
      {
        credentialCryptoContext: eduCredentialCryptoContext,
      }
    );

    expect(result.parsedCredential).toEqual(
      expect.objectContaining({
        tax_id_code: {
          value: "LVLDAA85T50G702B",
          name: {
            "it-IT": "Codice Fiscale",
            "en-US": "Tax id code",
          },
        },
        personal_administrative_number: {
          value: "JF97265AX",
          name: {
            "it-IT": "ID ANPR",
            "en-US": "Personal Administrative Number",
          },
        },
        education_degrees: expect.objectContaining({
          value: [
            expect.objectContaining({
              institute_name: {
                value: "Università degli studi di Roma La Sapienza",
                name: {
                  "it-IT": "Nome dell'Istituto",
                  "en-US": "Institute name",
                },
              },
              qualification_name: {
                value: " Dottore Magistrale",
                name: {
                  "it-IT": "Nome del titolo di studio",
                  "en-US": "Qualification name",
                },
              },
              qualification_grade_value: {
                value: "71/110",
                name: {
                  "it-IT": "Voto del titolo di studio",
                  "en-US": "Qualification grade value",
                },
              },
              academic_qualification_date: {
                value: "2024-01-24",
                name: {
                  "it-IT": "Data di conseguimento del titolo di studio",
                  "en-US": "Qualification date",
                },
              },
              programme_type_name: {
                value: "Laurea Magistrale (DM 270/04)",
                name: {
                  "it-IT": "Tipologia del corso di laurea",
                  "en-US": "Program type name",
                },
              },
              degree_class_name: {
                value: "Lettere",
                name: {
                  "it-IT": "Nome della classe di laurea",
                  "en-US": "Degree class name",
                },
              },
              degree_class: {
                value: "5",
                name: {
                  "it-IT": "Codice della classe di laurea",
                  "en-US": "Degree class code",
                },
              },
              degree_course_name: {
                value: "Lettere",
                name: {
                  "it-IT": "Nome del corso di laurea",
                  "en-US": "Degree course name",
                },
              },
            }),
            expect.objectContaining({
              institute_name: {
                value: "Università degli studi di Roma La Sapienza",
                name: {
                  "it-IT": "Nome dell'Istituto",
                  "en-US": "Institute name",
                },
              },
              qualification_name: {
                value: "Dottore",
                name: {
                  "it-IT": "Nome del titolo di studio",
                  "en-US": "Qualification name",
                },
              },
              qualification_grade_value: {
                value: "95/110",
                name: {
                  "it-IT": "Voto del titolo di studio",
                  "en-US": "Qualification grade value",
                },
              },
              academic_qualification_date: {
                value: "2021-01-24",
                name: {
                  "it-IT": "Data di conseguimento del titolo di studio",
                  "en-US": "Qualification date",
                },
              },
              programme_type_name: {
                value: "Laurea Triennale (DM 509/99)",
                name: {
                  "it-IT": "Tipologia del corso di laurea",
                  "en-US": "Program type name",
                },
              },
              degree_class_name: {
                value: "Scienze e tecnologie fisiche",
                name: {
                  "it-IT": "Nome della classe di laurea",
                  "en-US": "Degree class name",
                },
              },
              degree_class: {
                value: "25",
                name: {
                  "it-IT": "Codice della classe di laurea",
                  "en-US": "Degree class code",
                },
              },
              degree_course_name: {
                value: "Fisica",
                name: {
                  "it-IT": "Nome del corso di laurea",
                  "en-US": "Degree course name",
                },
              },
            }),
          ],
          name: {
            "it-IT": "Elenco dei titoli di studio",
            "en-US": "List of education degrees",
          },
        }),
      })
    );
  });

  it("verifies and parses a credential with optional claims (education_degrees)", async () => {
    const eduCredentialCryptoContext: CryptoContext = {
      getPublicKey: async () => ({
        kty: "EC",
        crv: "P-256",
        kid: "uGonT0KmgS7yWfFsHrlC4UK4xqQUJWxo2Wrix9_03UA",
        x: "NfD3cTWC4-tmrsKP0WSYYr262huexJdQ1D1OSRvoWd0",
        y: "ciUroXK-KZLt-TpnYFpjCkeefOrurDya2AxK6GA5ANc",
      }),
      getSignature: async () => "",
    };

    const mockIssuerConfWithOptional: IssuerConf = {
      ...mockIssuerConf,
      openid_credential_issuer: {
        ...mockIssuerConf.openid_credential_issuer,
        jwks: {
          keys: [
            {
              kty: "EC",
              use: "sig",
              crv: "P-256",
              kid: "HH9JY9xFA3eBp7GvQsJEfvgYXzHv4dEe8lnkxt0v0cQ",
              x: "Pm93czfLFUy8xFbWVra_JDZcOeDJ0sbp4bS0dWXAhZw",
              y: "maDVY3SuVjSoiHSD0I5_QvXcsqKzbPiciRgAN1o0Sdw",
              alg: "ES256",
            },
          ],
        },
        credential_configurations_supported: {
          ...mockIssuerConf.openid_credential_issuer
            .credential_configurations_supported,
          dc_sd_jwt_education_degree: {
            format: "dc+sd-jwt",
            vct: "https://ta.wallet.ipzs.it/schemas/v1.0.0/education_degree.json",
            scope: "EducationCredential",
            claims: [
              {
                path: ["education_degrees", null],
                display: [
                  { locale: "it-IT", name: "Elenco dei titoli di studio" },
                  { locale: "en-US", name: "List of education degrees" },
                ],
              },
              {
                path: ["education_degrees", null, "institute_name"],
                display: [
                  { locale: "it-IT", name: "Nome dell'Istituto" },
                  { locale: "en-US", name: "Institute name" },
                ],
              },
              {
                path: ["education_degrees", null, "qualification_name"],
                display: [
                  { locale: "it-IT", name: "Nome del titolo di studio" },
                  { locale: "en-US", name: "Qualification name" },
                ],
              },
              {
                path: ["education_degrees", null, "qualification_grade_value"],
                display: [
                  { locale: "it-IT", name: "Voto del titolo di studio" },
                  { locale: "en-US", name: "Qualification grade value" },
                ],
              },
              {
                path: [
                  "education_degrees",
                  null,
                  "academic_qualification_date",
                ],
                display: [
                  {
                    locale: "it-IT",
                    name: "Data di conseguimento del titolo di studio",
                  },
                  { locale: "en-US", name: "Qualification date" },
                ],
              },
              {
                path: ["education_degrees", null, "programme_type_name"],
                display: [
                  { locale: "it-IT", name: "Tipologia del corso di laurea" },
                  { locale: "en-US", name: "Program type name" },
                ],
              },
              {
                path: ["education_degrees", null, "degree_class_name"],
                display: [
                  { locale: "it-IT", name: "Nome della classe di laurea" },
                  { locale: "en-US", name: "Degree class name" },
                ],
              },
              {
                path: ["education_degrees", null, "degree_class"],
                display: [
                  { locale: "it-IT", name: "Codice della classe di laurea" },
                  { locale: "en-US", name: "Degree class code" },
                ],
              },
              {
                path: ["education_degrees", null, "degree_course_name"],
                display: [
                  { locale: "it-IT", name: "Nome del corso di laurea" },
                  { locale: "en-US", name: "Degree course name" },
                ],
              },
            ],
            display: [],
            credential_signing_alg_values_supported: ["ES256"],
            cryptographic_binding_methods_supported: [],
          },
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithOptional,
      education_degree_with_missing_keys,
      "dc_sd_jwt_education_degree",
      {
        credentialCryptoContext: eduCredentialCryptoContext,
      }
    );

    expect(result.parsedCredential).toEqual({
      education_degrees: {
        name: {
          "it-IT": "Elenco dei titoli di studio",
          "en-US": "List of education degrees",
        },
        value: [
          {
            institute_name: {
              value: "Università degli studi di Roma La Sapienza",
              name: {
                "it-IT": "Nome dell'Istituto",
                "en-US": "Institute name",
              },
            },
            qualification_name: {
              value: " Dottore Magistrale",
              name: {
                "it-IT": "Nome del titolo di studio",
                "en-US": "Qualification name",
              },
            },
            programme_type_name: {
              value: "Laurea Magistrale (DM 270/04)",
              name: {
                "it-IT": "Tipologia del corso di laurea",
                "en-US": "Program type name",
              },
            },
            degree_course_name: {
              value: "Lettere",
              name: {
                "it-IT": "Nome del corso di laurea",
                "en-US": "Degree course name",
              },
            },
            academic_qualification_date: {
              value: "2024-01-24",
              name: {
                "it-IT": "Data di conseguimento del titolo di studio",
                "en-US": "Qualification date",
              },
            },
          },
          {
            institute_name: {
              value: "Università degli studi di Roma La Sapienza",
              name: {
                "it-IT": "Nome dell'Istituto",
                "en-US": "Institute name",
              },
            },
            qualification_name: {
              value: "Dottore",
              name: {
                "it-IT": "Nome del titolo di studio",
                "en-US": "Qualification name",
              },
            },
            programme_type_name: {
              value: "Laurea Triennale (DM 509/99)",
              name: {
                "it-IT": "Tipologia del corso di laurea",
                "en-US": "Program type name",
              },
            },
            degree_course_name: {
              value: "Fisica",
              name: {
                "it-IT": "Nome del corso di laurea",
                "en-US": "Degree course name",
              },
            },
            academic_qualification_date: {
              value: "2021-01-24",
              name: {
                "it-IT": "Data di conseguimento del titolo di studio",
                "en-US": "Qualification date",
              },
            },
            degree_class_name: {
              value: "Scienze e tecnologie fisiche",
              name: {
                "it-IT": "Nome della classe di laurea",
                "en-US": "Degree class name",
              },
            },
          },
        ],
      },
    });
  });

  it("verifies and parses a credential with multiple nested attributes and missing keys", async () => {
    const mockIssuerConfWithDeepNested: IssuerConf = {
      ...mockIssuerConf,
      openid_credential_issuer: {
        ...mockIssuerConf.openid_credential_issuer,
        credential_configurations_supported: {
          dc_sd_jwt_mDL: {
            format: "dc+sd-jwt",
            vct: "https://issuer.example.com/MyCredential",
            scope: "mDL",
            display: [],
            credential_signing_alg_values_supported: ["ES256"],
            cryptographic_binding_methods_supported: [],
            claims: [
              {
                path: ["driving_privileges", null],
                display: [
                  { name: "Codici", locale: "it-IT" },
                  { name: "Driving privileges", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "vehicle_category_code"],
                display: [
                  { name: "Categoria", locale: "it-IT" },
                  { name: "Category code", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "issue_date"],
                display: [
                  { name: "Data rilascio categoria", locale: "it-IT" },
                  { name: "Category issue date", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "expiry_date"],
                display: [
                  { name: "Data di scadenza della categoria", locale: "it-IT" },
                  { name: "Category expiry date", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "codes", null],
                display: [
                  {
                    name: "Restrizioni e condizioni della categoria",
                    locale: "it-IT",
                  },
                  { name: "Category conditions/restrictions", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "codes", null, "code"],
                display: [
                  { name: "Codice restrizione/condizione", locale: "it-IT" },
                  { name: "Condition/restriction code", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "codes", null, "sign"],
                display: [
                  { name: "Segno restrizione/condizione", locale: "it-IT" },
                  { name: "Condition/restriction sign", locale: "en-US" },
                ],
              },
              {
                path: ["driving_privileges", null, "codes", null, "value"],
                display: [
                  { name: "Valore restrizione/condizione", locale: "it-IT" },
                  { name: "Condition/restriction value", locale: "en-US" },
                ],
              },
            ],
          },
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithDeepNested,
      mdl.token,
      "dc_sd_jwt_mDL",
      { credentialCryptoContext }
    );

    expect(result.parsedCredential).toEqual({
      driving_privileges: {
        value: [
          {
            vehicle_category_code: {
              value: "AM",
              name: { "it-IT": "Categoria", "en-US": "Category code" },
            },
            issue_date: {
              value: "2015-08-19",
              name: {
                "it-IT": "Data rilascio categoria",
                "en-US": "Category issue date",
              },
            },
            expiry_date: {
              value: "2032-09-02",
              name: {
                "it-IT": "Data di scadenza della categoria",
                "en-US": "Category expiry date",
              },
            },
          },
          {
            vehicle_category_code: {
              value: "B",
              name: { "it-IT": "Categoria", "en-US": "Category code" },
            },
            issue_date: {
              value: "2015-07-11",
              name: {
                "it-IT": "Data rilascio categoria",
                "en-US": "Category issue date",
              },
            },
            expiry_date: {
              value: "2033-04-17",
              name: {
                "it-IT": "Data di scadenza della categoria",
                "en-US": "Category expiry date",
              },
            },
            codes: {
              value: [
                {
                  code: {
                    value: "01",
                    name: {
                      "it-IT": "Codice restrizione/condizione",
                      "en-US": "Condition/restriction code",
                    },
                  },
                  sign: {
                    value: "02",
                    name: {
                      "it-IT": "Segno restrizione/condizione",
                      "en-US": "Condition/restriction sign",
                    },
                  },
                  value: {
                    value: "Guida con lenti",
                    name: {
                      "it-IT": "Valore restrizione/condizione",
                      "en-US": "Condition/restriction value",
                    },
                  },
                },
              ],
              name: {
                "it-IT": "Restrizioni e condizioni della categoria",
                "en-US": "Category conditions/restrictions",
              },
            },
          },
        ],
        name: { "it-IT": "Codici", "en-US": "Driving privileges" },
      },
    });
  });

  it("verifies and parses a credential with nested object attributes (residency)", async () => {
    const residencyCryptoContext: CryptoContext = {
      getPublicKey: async () => ({
        kty: "EC",
        crv: "P-256",
        kid: "vUFSDAlxDSRvRvsGHsqw_2Mi9Ftkxnoqy4fp9vwN1EI",
        x: "vmYlfIy-_sVEai7IIgo1JPNja6zPq9bGNw0YFrcwT80",
        y: "ZowTYQQCB42ioO0l_NEFG42VmGunfM-p1pgTVFFAi28",
      }),
      getSignature: async () => "",
    };

    const mockIssuerConfWithNested: IssuerConf = {
      ...mockIssuerConf,
      openid_credential_issuer: {
        ...mockIssuerConf.openid_credential_issuer,
        jwks: {
          keys: [
            {
              kty: "EC",
              use: "sig",
              crv: "P-256",
              kid: "HH9JY9xFA3eBp7GvQsJEfvgYXzHv4dEe8lnkxt0v0cQ",
              x: "Pm93czfLFUy8xFbWVra_JDZcOeDJ0sbp4bS0dWXAhZw",
              y: "maDVY3SuVjSoiHSD0I5_QvXcsqKzbPiciRgAN1o0Sdw",
              alg: "ES256",
            },
          ],
        },
        credential_configurations_supported: {
          ...mockIssuerConf.openid_credential_issuer
            .credential_configurations_supported,
          dc_sd_jwt_residency: {
            format: "dc+sd-jwt",
            vct: "https://issuer.example.com/MyCredential",
            scope: "Residency",
            claims: [
              {
                path: ["tax_id_code"],
                display: [
                  { locale: "it-IT", name: "Codice Fiscale" },
                  { locale: "en-US", name: "Tax id code" },
                ],
              },
              {
                path: ["personal_administrative_number"],
                display: [
                  { locale: "it-IT", name: "ID ANPR" },
                  { locale: "en-US", name: "Personal Administrative Number" },
                ],
              },
              {
                path: ["birth_date"],
                display: [
                  { locale: "it-IT", name: "Data di nascita" },
                  { locale: "en-US", name: "Date of birth" },
                ],
              },
              {
                path: ["address"],
                display: [
                  { locale: "it-IT", name: "Indirizzo" },
                  { locale: "en-US", name: "Address" },
                ],
              },
              {
                path: ["address", "locality"],
                display: [
                  { locale: "it-IT", name: "Località" },
                  { locale: "en-US", name: "Locality" },
                ],
              },
              {
                path: ["address", "locality_fraction"],
                display: [
                  { locale: "it-IT", name: "Frazione" },
                  { locale: "en-US", name: "Locality fraction" },
                ],
              },
              {
                path: ["address", "region"],
                display: [
                  { locale: "it-IT", name: "Regione" },
                  { locale: "en-US", name: "Region" },
                ],
              },
              {
                path: ["address", "postal_code"],
                display: [
                  { locale: "it-IT", name: "CAP" },
                  { locale: "en-US", name: "Postal Code" },
                ],
              },
              {
                path: ["address", "country"],
                display: [
                  { locale: "it-IT", name: "Paese" },
                  { locale: "en-US", name: "Country" },
                ],
              },
            ],
            display: [],
            credential_signing_alg_values_supported: ["ES256"],
            cryptographic_binding_methods_supported: [],
          },
        },
      },
    };

    const result = await verifyAndParseCredential(
      mockIssuerConfWithNested,
      residency,
      "dc_sd_jwt_residency",
      {
        credentialCryptoContext: residencyCryptoContext,
      }
    );

    expect(result.parsedCredential).toEqual(
      expect.objectContaining({
        tax_id_code: {
          value: "LVLDAA85T50G702B",
          name: {
            "it-IT": "Codice Fiscale",
            "en-US": "Tax id code",
          },
        },
        personal_administrative_number: {
          value: "JF97265AX",
          name: {
            "it-IT": "ID ANPR",
            "en-US": "Personal Administrative Number",
          },
        },
        birth_date: {
          value: "1956-09-02",
          name: {
            "it-IT": "Data di nascita",
            "en-US": "Date of birth",
          },
        },
        address: {
          value: expect.objectContaining({
            locality: {
              value: "PAVULLO NEL FRIGNANO",
              name: {
                "it-IT": "Località",
                "en-US": "Locality",
              },
            },
            region: {
              value: "MO",
              name: {
                "it-IT": "Regione",
                "en-US": "Region",
              },
            },
            postal_code: {
              value: "00100",
              name: {
                "it-IT": "CAP",
                "en-US": "Postal Code",
              },
            },
          }),
          name: {
            "it-IT": "Indirizzo",
            "en-US": "Address",
          },
        },
      })
    );
  });
});
