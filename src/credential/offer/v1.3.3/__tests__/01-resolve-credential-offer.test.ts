import {
  InvalidQRCodeError,
  InvalidCredentialOfferError,
} from "../../common/errors";
import { resolveCredentialOffer } from "../01-resolve-credential-offer";

const mockResolveCredentialOffer = jest.fn();
const mockValidateCredentialOffer = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  resolveCredentialOffer: (...args: unknown[]) =>
    mockResolveCredentialOffer(...args),
  validateCredentialOffer: (...args: unknown[]) =>
    mockValidateCredentialOffer(...args),
  CredentialOfferError: jest.requireActual("@pagopa/io-wallet-oid4vci")
    .CredentialOfferError,
}));

const validCredentialOffer = {
  credential_issuer: "https://issuer.example.com",
  credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
  grants: {
    authorization_code: {
      scope: "org.iso.18013.5.1.mDL",
      authorization_server: "https://auth.example.com",
      issuer_state: "some-issuer-state",
    },
  },
};

describe("resolveCredentialOffer", () => {
  beforeEach(() => {
    mockResolveCredentialOffer.mockReset();
    mockValidateCredentialOffer.mockReset();
    mockValidateCredentialOffer.mockResolvedValue(undefined);
  });

  it("should resolve and validate a credential offer by value", async () => {
    const uri =
      "openid-credential-offer://?credential_offer=" +
      encodeURIComponent(JSON.stringify(validCredentialOffer));

    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);

    const result = await resolveCredentialOffer(uri);

    expect(mockResolveCredentialOffer).toHaveBeenCalledWith({
      credentialOffer: uri,
      callbacks: { fetch: expect.any(Function) },
    });
    expect(mockValidateCredentialOffer).toHaveBeenCalledWith({
      credentialOffer: validCredentialOffer,
    });
    expect(result).toEqual(validCredentialOffer);
  });

  it("should resolve and validate a credential offer by reference", async () => {
    const uri =
      "openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example.com%2Foffer";

    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);

    const result = await resolveCredentialOffer(uri);

    expect(mockResolveCredentialOffer).toHaveBeenCalledWith({
      credentialOffer: uri,
      callbacks: { fetch: expect.any(Function) },
    });
    expect(result).toEqual(validCredentialOffer);
  });

  it("should use the provided fetch function", async () => {
    const customFetch = jest.fn();
    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);

    await resolveCredentialOffer("some-uri", { fetch: customFetch });

    expect(mockResolveCredentialOffer).toHaveBeenCalledWith({
      credentialOffer: "some-uri",
      callbacks: { fetch: customFetch },
    });
  });

  it("should throw InvalidQRCodeError when resolve fails with CredentialOfferError", async () => {
    const { CredentialOfferError } = jest.requireActual(
      "@pagopa/io-wallet-oid4vci"
    );
    mockResolveCredentialOffer.mockRejectedValue(
      new CredentialOfferError("Unsupported scheme")
    );

    await expect(resolveCredentialOffer("http://invalid")).rejects.toThrow(
      InvalidQRCodeError
    );
  });

  it("should throw InvalidCredentialOfferError when validation fails with CredentialOfferError", async () => {
    const { CredentialOfferError } = jest.requireActual(
      "@pagopa/io-wallet-oid4vci"
    );
    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);
    mockValidateCredentialOffer.mockRejectedValue(
      new CredentialOfferError("credential_issuer must be an HTTPS URL")
    );

    await expect(
      resolveCredentialOffer("openid-credential-offer://?credential_offer=foo")
    ).rejects.toThrow(InvalidCredentialOfferError);
  });

  it("should rethrow non-CredentialOfferError from resolve", async () => {
    const unexpectedError = new Error("network failure");
    mockResolveCredentialOffer.mockRejectedValue(unexpectedError);

    await expect(resolveCredentialOffer("some-uri")).rejects.toThrow(
      unexpectedError
    );
  });

  it("should rethrow non-CredentialOfferError from validation", async () => {
    const unexpectedError = new Error("unexpected");
    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);
    mockValidateCredentialOffer.mockRejectedValue(unexpectedError);

    await expect(resolveCredentialOffer("some-uri")).rejects.toThrow(
      unexpectedError
    );
  });
});
