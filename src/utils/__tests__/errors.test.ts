import type { CredentialIssuerEntityConfiguration } from "../../trust";
import { extractErrorMessageFromIssuerConf } from "../errors";

type EntityConfig = CredentialIssuerEntityConfiguration["payload"]["metadata"];

describe("extractErrorMessageFromIssuerConf", () => {
  it("should throw when no credential configuration is found", async () => {
    expect(() =>
      extractErrorMessageFromIssuerConf("credential_revoked", {
        credentialType: "MDL",
        issuerConf: {
          openid_credential_issuer: {
            credential_configurations_supported: {},
          },
        } as EntityConfig,
      })
    ).toThrow();
  });

  it("should return undefined when no credential issuance error is found", async () => {
    expect(
      extractErrorMessageFromIssuerConf("credential_revoked", {
        credentialType: "MDL",
        // @ts-expect-error partial type
        issuerConf: {
          openid_credential_issuer: {
            credential_configurations_supported: {
              MDL: {},
            },
          },
        } as EntityConfig,
      })
    ).toBeUndefined();

    expect(
      extractErrorMessageFromIssuerConf("credential_revoked", {
        credentialType: "MDL",
        // @ts-expect-error partial type
        issuerConf: {
          openid_credential_issuer: {
            credential_configurations_supported: {
              MDL: {
                issuance_errors_supported: {
                  credential_voided: {},
                },
              },
            },
          },
        } as EntityConfig,
      })
    ).toBeUndefined();
  });

  it("should return the error message grouped by locales", async () => {
    expect(
      extractErrorMessageFromIssuerConf("credential_revoked", {
        credentialType: "MDL",
        // @ts-expect-error partial type
        issuerConf: {
          openid_credential_issuer: {
            credential_configurations_supported: {
              MDL: {
                issuance_errors_supported: {
                  credential_revoked: {
                    display: [
                      { title: "Ciao", description: "Ciao", locale: "it-IT" },
                      { title: "Hello", description: "Hello", locale: "en-US" },
                    ],
                  },
                },
              },
            },
          },
        } as EntityConfig,
      })
    ).toEqual({
      "it-IT": { title: "Ciao", description: "Ciao" },
      "en-US": { title: "Hello", description: "Hello" },
    });
  });
});
