import type { CredentialOffer } from "@pagopa/io-wallet-oid4vci";
import { validateCredentialOffer } from "../03-validate-credential-offer";
import { InvalidCredentialOfferError } from "../../common/errors";
import { sdkConfigV1_3 } from "../../../../utils/config";

const mockValidateCredentialOffer = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  validateCredentialOffer: (...args: unknown[]) =>
    mockValidateCredentialOffer(...args),
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

const credentialIssuerMetadata = {
  authorization_servers: ["https://auth.example.com"] as [string, ...string[]],
};

describe("validateCredentialOffer", () => {
  beforeEach(() => {
    mockValidateCredentialOffer.mockReset();
  });

  it("should delegate to the SDK with the offer and issuer metadata", async () => {
    mockValidateCredentialOffer.mockResolvedValue(undefined);

    await validateCredentialOffer({
      offer: validOffer,
      credentialIssuerMetadata,
    });

    expect(mockValidateCredentialOffer).toHaveBeenCalledWith({
      config: sdkConfigV1_3,
      credentialOffer: validOffer,
      credentialIssuerMetadata,
    });
  });

  it("should throw InvalidCredentialOfferError when the SDK rejects with CredentialOfferError", async () => {
    const { CredentialOfferError } = jest.requireActual(
      "@pagopa/io-wallet-oid4vci"
    );
    mockValidateCredentialOffer.mockRejectedValue(
      new CredentialOfferError("authorization_server does not match metadata")
    );

    await expect(
      validateCredentialOffer({ offer: validOffer, credentialIssuerMetadata })
    ).rejects.toThrow(InvalidCredentialOfferError);
  });

  it("should rethrow non-CredentialOfferError errors as-is", async () => {
    const unexpectedError = new Error("unexpected");
    mockValidateCredentialOffer.mockRejectedValue(unexpectedError);

    await expect(
      validateCredentialOffer({ offer: validOffer, credentialIssuerMetadata })
    ).rejects.toThrow(unexpectedError);
  });
});
