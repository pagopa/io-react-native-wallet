import type { CredentialOffer } from "@pagopa/io-wallet-oid4vci";

import { validateCredentialOffer } from "../03-validate-credential-offer";
import { sdkConfigV1_3 } from "../../../../utils/config";
import { InvalidCredentialOfferError } from "../../common/errors";

const mockValidateCredentialOffer = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  CredentialOfferError: jest.requireActual("@pagopa/io-wallet-oid4vci")
    .CredentialOfferError,
  validateCredentialOffer: (...args: unknown[]) =>
    mockValidateCredentialOffer(...args),
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
      credentialIssuerMetadata,
      offer: validOffer,
    });

    expect(mockValidateCredentialOffer).toHaveBeenCalledWith({
      config: sdkConfigV1_3,
      credentialIssuerMetadata,
      credentialOffer: validOffer,
    });
  });

  it("should throw InvalidCredentialOfferError when the SDK rejects with CredentialOfferError", async () => {
    const { CredentialOfferError } = jest.requireActual(
      "@pagopa/io-wallet-oid4vci",
    );
    mockValidateCredentialOffer.mockRejectedValue(
      new CredentialOfferError("authorization_server does not match metadata"),
    );

    await expect(
      validateCredentialOffer({ credentialIssuerMetadata, offer: validOffer }),
    ).rejects.toThrow(InvalidCredentialOfferError);
  });

  it("should rethrow non-CredentialOfferError errors as-is", async () => {
    const unexpectedError = new Error("unexpected");
    mockValidateCredentialOffer.mockRejectedValue(unexpectedError);

    await expect(
      validateCredentialOffer({ credentialIssuerMetadata, offer: validOffer }),
    ).rejects.toThrow(unexpectedError);
  });
});
