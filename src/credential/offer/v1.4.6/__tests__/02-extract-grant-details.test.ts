import type { CredentialOffer } from "@pagopa/io-wallet-oid4vci";

import { extractGrantDetails } from "../02-extract-grant-details";
import { sdkConfigV1_4 } from "../../../../utils/config";
import { InvalidCredentialOfferError } from "../../common/errors";

const mockExtractGrantDetails = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  CredentialOfferError: jest.requireActual("@pagopa/io-wallet-oid4vci")
    .CredentialOfferError,
  extractGrantDetails: (...args: unknown[]) => mockExtractGrantDetails(...args),
}));

const validOffer: CredentialOffer = {
  credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
  credential_issuer: "https://issuer.example.com",
  grants: {
    authorization_code: {
      authorization_server: "https://auth.example.com",
      issuer_state: "some-issuer-state",
      scope: "test-scope",
    },
  },
};

describe("extractGrantDetails", () => {
  beforeEach(() => {
    mockExtractGrantDetails.mockReset();
  });

  it("should return SDK result directly", () => {
    const sdkResult = {
      authorizationCodeGrant: {
        authorizationServer: "https://auth.example.com",
        issuerState: "some-issuer-state",
        scope: "test-scope",
      },
      grantType: "authorization_code" as const,
    };
    mockExtractGrantDetails.mockReturnValue(sdkResult);

    const result = extractGrantDetails(validOffer);

    expect(result).toEqual(sdkResult);
    expect(mockExtractGrantDetails).toHaveBeenCalledWith({
      config: sdkConfigV1_4,
      credentialOffer: validOffer,
    });
  });

  it("should throw InvalidCredentialOfferError when SDK throws CredentialOfferError", () => {
    const { CredentialOfferError } = jest.requireActual(
      "@pagopa/io-wallet-oid4vci",
    );
    mockExtractGrantDetails.mockImplementation(() => {
      throw new CredentialOfferError("No grants found in credential offer");
    });

    expect(() => extractGrantDetails(validOffer)).toThrow(
      InvalidCredentialOfferError,
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
