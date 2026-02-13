import type { CredentialOffer } from "@pagopa/io-wallet-oid4vci";
import { extractGrantDetails } from "../02-extract-grant-details";
import { InvalidCredentialOfferError } from "../../common/errors";

const mockExtractGrantDetails = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  extractGrantDetails: (...args: unknown[]) => mockExtractGrantDetails(...args),
  CredentialOfferError: jest.requireActual("@pagopa/io-wallet-oid4vci")
    .CredentialOfferError,
}));

const validOffer: CredentialOffer = {
  credential_issuer: "https://issuer.example.com",
  credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
  grants: {
    authorization_code: {
      scope: "test-scope",
      issuer_state: "some-issuer-state",
      authorization_server: "https://auth.example.com",
    },
  },
};

describe("extractGrantDetails", () => {
  beforeEach(() => {
    mockExtractGrantDetails.mockReset();
  });

  it("should return SDK result directly", () => {
    const sdkResult = {
      grantType: "authorization_code" as const,
      authorizationCodeGrant: {
        scope: "test-scope",
        issuerState: "some-issuer-state",
        authorizationServer: "https://auth.example.com",
      },
    };
    mockExtractGrantDetails.mockReturnValue(sdkResult);

    const result = extractGrantDetails(validOffer);

    expect(result).toEqual(sdkResult);
    expect(mockExtractGrantDetails).toHaveBeenCalledWith(validOffer);
  });

  it("should throw InvalidCredentialOfferError when SDK throws CredentialOfferError", () => {
    const { CredentialOfferError } = jest.requireActual(
      "@pagopa/io-wallet-oid4vci"
    );
    mockExtractGrantDetails.mockImplementation(() => {
      throw new CredentialOfferError("No grants found in credential offer");
    });

    expect(() => extractGrantDetails(validOffer)).toThrow(
      InvalidCredentialOfferError
    );
  });

  it("should rethrow non-CredentialOfferError errors as-is", () => {
    const unexpectedError = new Error("unexpected");
    mockExtractGrantDetails.mockImplementation(() => {
      throw unexpectedError;
    });

    expect(() => extractGrantDetails(validOffer)).toThrow(unexpectedError);
  });
});
