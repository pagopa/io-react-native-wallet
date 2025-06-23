import type { CredentialIssuerEntityConfiguration } from "../../../trust/types";
import { verifyAndParseCredential } from "..";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

type IssuerConf = CredentialIssuerEntityConfiguration["payload"]["metadata"];

describe("verifyAndParseCredential", () => {
  const credentialCryptoContext: CryptoContext = {
    getPublicKey: async () => ({
      crv: "P-256",
      kid: "s9oUJPLn0n2JmAXzunoDdEePjS6oemtO3V-Gp-pFTDQ",
      kty: "EC",
      x: "doI4arl7NML-PYtubUU_xZwTVqfAPZeDc-a1JLtHvdw",
      y: "PAucTD2j1Sd9u87eaobFlMRao_ORZpBaBakbeKa5R78",
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
            kid: "33e16787-923b-4264-952b-1d4bba5ee02f",
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
              path: ["birth_place"],
              display: [
                { locale: "it-IT", name: "Luogo di nascita" },
                { locale: "en-US", name: "Place of birth" },
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
  const credential =
    "eyJraWQiOiIzM2UxNjc4Ny05MjNiLTQyNjQtOTUyYi0xZDRiYmE1ZWUwMmYiLCJ0eXAiOiJkYytzZC1qd3QiLCJhbGciOiJFUzI1NiJ9.eyJfc2QiOlsibmxXX1U2cjRPM214R1BlS3VaSm51RWYwYVVSd3J4eXNtWmpqQzBzV0xpQSIsImlqZlVKTjlsc0c0TXBYVEtrTUo3bjJURUV6UU5QUlBvM0NTTXl0akpjLVEiLCJPVG8zVVdQZy1xeENmNHczUFFUM2ZOR0NVY2o4UmU1SXB4Rm5tTmZNQlVzIiwiQVJRcHBTV3FJdDFORTRxRFNxaFpBQWF1Qm5mMnYzRXY3M1l6WTlYd1Q2QSIsIkVYaE9JOWlPWWZ6cjE5MmQ3U2NoLVB5R0ZZSDlkU2pLd2xkWkt4U0p2R0EiXSwic3ViIjoiMGFjNDljZTctOTAxNy00MTgwLTg4OTQtZDljMGRiOTk0Mjc0IiwidmN0I2ludGVncml0eSI6ImI5OGVjNTRjNDhjYjdmZDg1MTY0M2YzNDU2OTg1NWZhMGI4ODc3OTllODg1ZTlkZjM3YjE4MTIwMzU2N2M2NWUiLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20vTXlDcmVkZW50aWFsIiwiaXNzdWluZ19hdXRob3JpdHkiOiJDcmVkZW50aWFsSXNzdWVyIiwiaXNzIjoiaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS5jb20iLCJjbmYiOnsiandrIjp7ImNydiI6IlAtMjU2Iiwia2lkIjoiczlvVUpQTG4wbjJKbUFYenVub0RkRWVQalM2b2VtdE8zVi1HcC1wRlREUSIsImt0eSI6IkVDIiwieCI6ImRvSTRhcmw3Tk1MLVBZdHViVVVfeFp3VFZxZkFQWmVEYy1hMUpMdEh2ZHciLCJ5IjoiUEF1Y1REMmoxU2Q5dTg3ZWFvYkZsTVJhb19PUlpwQmFCYWtiZUthNVI3OCJ9fSwiZXhwIjoxNzgyMjAyNzY5LCJzdGF0dXMiOnsic3RhdHVzX2Fzc2VydGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0.WjkX97oq7UqW-bq8DLjNLihLUQdkppE3ug-J7ar99x2MImoeAl80wBJuFljVnbU3xyadvuSiCmpfsiy0FTjiTA~WyJ2UmZhaWplRjJrak03LW9DTHF4TlFRIiwiYmlydGhfZGF0ZSIsIjE5ODAtMTAtMTAiXQ~WyJ2U05FUnI3WjBvZ3lncXdnT3BsS3BBIiwiYmlydGhfcGxhY2UiLCJST01BIl0~WyJrc1BYeVdnSWprblBoUUJGVHltdF9RIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0~WyJvY25hLVNYR09EN1dpeGl6YVhRLWx3IiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyJpanlIcG45R1VZUFdlbXVOaTI0ZUZBIiwiaWF0IiwxNzUwNjY2NzY2XQ~";

  it("verifies and parses a valid SD-JWT credential", async () => {
    const result = await verifyAndParseCredential(
      mockIssuerConf,
      credential,
      "mock_valid_sd_jwt_cred",
      { credentialCryptoContext }
    );

    expect(result).toEqual({
      parsedCredential: {
        given_name: {
          value: "Mario",
          name: { "it-IT": "Nome", "en-US": "First Name" },
        },
        family_name: {
          value: "Rossi",
          name: { "it-IT": "Cognome", "en-US": "Family Name" },
        },
        birth_date: {
          value: "1980-10-10",
          name: { "it-IT": "Data di nascita", "en-US": "Date of birth" },
        },
        birth_place: {
          value: "ROMA",
          name: { "it-IT": "Luogo di nascita", "en-US": "Place of birth" },
        },
      },
      expiration: new Date(1782202769000),
      issuedAt: new Date(1750666766000),
    });
  });

  it("throws in case of unsupported format", async () => {
    await expect(() =>
      verifyAndParseCredential(
        mockIssuerConf,
        credential,
        "mock_invalid_cred",
        { credentialCryptoContext }
      )
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
        credential,
        "mock_valid_sd_jwt_cred",
        { credentialCryptoContext: altCredentialCryptoContext }
      )
    ).rejects.toThrow(
      "Failed to verify holder binding, expected kid: ee5dece9-d4fc-4107-a854-1b7488dd9295, got: s9oUJPLn0n2JmAXzunoDdEePjS6oemtO3V-Gp-pFTDQ"
    );
  });
});
