import {
  extractErrorMessageFromIssuerConf,
  isIssuerResponseError,
  isRelyingPartyResponseError,
  IssuerResponseError,
  IssuerResponseErrorCodes,
  isWalletProviderResponseError,
  RelyingPartyResponseError,
  RelyingPartyResponseErrorCodes,
  ResponseErrorBuilder,
  UnexpectedStatusCodeError,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../errors";
import type { CredentialIssuerEntityConfiguration } from "../../trust/types";

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

describe("ResponseErrorBuilder", () => {
  const errorBuilderWithFallback = new ResponseErrorBuilder(IssuerResponseError)
    .handle(403, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "A message",
    })
    .handle(409, {
      code: IssuerResponseErrorCodes.CredentialIssuingNotSynchronous,
      message: "Another message",
      reason: "A custom reason",
    })
    .handle("*", {
      code: IssuerResponseErrorCodes.IssuerGenericError,
      message: "Fallback error case",
    });

  test.each([
    {
      original: new UnexpectedStatusCodeError({
        message: "base message",
        reason: "base reason",
        statusCode: 403,
      }),
      target: new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialInvalidStatus,
        message: "A message",
        reason: "base reason",
        statusCode: 403,
      }),
    },
    {
      original: new UnexpectedStatusCodeError({
        message: "base message",
        reason: "base reason",
        statusCode: 409,
      }),
      target: new IssuerResponseError({
        code: IssuerResponseErrorCodes.CredentialIssuingNotSynchronous,
        message: "Another message",
        reason: "A custom reason",
        statusCode: 409,
      }),
    },
    {
      original: new UnexpectedStatusCodeError({
        message: "base message",
        reason: "base reason",
        statusCode: 500,
      }),
      target: new IssuerResponseError({
        code: IssuerResponseErrorCodes.IssuerGenericError,
        message: "Fallback error case",
        reason: "base reason",
        statusCode: 500,
      }),
    },
  ])(
    "should create the correct error for status code $original.statusCode",
    ({ original, target }) => {
      const error = errorBuilderWithFallback.buildFrom(original);
      expect(error.code).toEqual(target.code);
      expect(error.message).toEqual(target.message);
      expect(error.reason).toEqual(target.reason);
      expect(error.statusCode).toEqual(target.statusCode);
    }
  );

  it("should return the original error when nothing matches", () => {
    const errorBuilderWithoutFallback = new ResponseErrorBuilder(
      IssuerResponseError
    ).handle(403, {
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "A message",
    });

    const original = new UnexpectedStatusCodeError({
      message: "base message",
      reason: "base reason",
      statusCode: 500,
    });

    const error = errorBuilderWithoutFallback.buildFrom(original);
    expect(error).toEqual(original);
  });
});

describe("Error type guards", () => {
  const typeGuards = {
    isIssuerResponseError,
    isWalletProviderResponseError,
    isRelyingPartyResponseError,
  };

  test.each([
    ["isIssuerResponseError", IssuerResponseError, IssuerResponseErrorCodes],
    [
      "isWalletProviderResponseError",
      WalletProviderResponseError,
      WalletProviderResponseErrorCodes,
    ],
    [
      "isRelyingPartyResponseError",
      RelyingPartyResponseError,
      RelyingPartyResponseErrorCodes,
    ],
  ])("%s type guard works correctly", (guardName, ErrorClass, errorCodes) => {
    const typeGuard = typeGuards[guardName as keyof typeof typeGuards];

    const [correctCode, wrongCode] = Object.keys(errorCodes);

    const error = new ErrorClass({
      // @ts-ignore
      code: correctCode,
      message: "A message",
      reason: "A reason",
      statusCode: 400,
    });

    expect(typeGuard(error)).toBe(true);
    // @ts-ignore
    expect(typeGuard(error, correctCode)).toBe(true);
    // @ts-ignore
    expect(typeGuard(error, wrongCode)).toBe(false);
  });
});
