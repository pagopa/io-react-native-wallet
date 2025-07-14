import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { CredentialIssuerEntityConfiguration } from "../../../trust/types";
import { pid } from "../../../sd-jwt/__mocks__/sd-jwt";
import { verifyAndParseCredential } from "..";

type IssuerConf = CredentialIssuerEntityConfiguration["payload"]["metadata"];

describe("verifyAndParseCredential", () => {
  const credentialCryptoContext: CryptoContext = {
    getPublicKey: async () => ({
      kty: "EC",
      crv: "P-256",
      kid: "Rv3W-EiKpvBTyk5yZxvrev-7MDB6SlzUCBo_CQjjddU",
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
});
