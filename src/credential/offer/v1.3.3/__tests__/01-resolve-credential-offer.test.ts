import { InvalidQRCodeError } from "../../common/errors";
import { resolveCredentialOffer } from "../01-resolve-credential-offer";
import { sdkConfigV1_3 } from "../../../../utils/config";

const mockResolveCredentialOffer = jest.fn();

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  resolveCredentialOffer: (...args: unknown[]) =>
    mockResolveCredentialOffer(...args),
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
  });

  it("should resolve a credential offer by value", async () => {
    const uri =
      "openid-credential-offer://?credential_offer=" +
      encodeURIComponent(JSON.stringify(validCredentialOffer));

    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);

    const result = await resolveCredentialOffer(uri);

    expect(mockResolveCredentialOffer).toHaveBeenCalledWith({
      config: sdkConfigV1_3,
      credentialOffer: uri,
      callbacks: { fetch: expect.any(Function) },
    });
    expect(result).toEqual(validCredentialOffer);
  });

  it("should resolve a credential offer by reference", async () => {
    const uri =
      "openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example.com%2Foffer";

    mockResolveCredentialOffer.mockResolvedValue(validCredentialOffer);

    const result = await resolveCredentialOffer(uri);

    expect(mockResolveCredentialOffer).toHaveBeenCalledWith({
      config: sdkConfigV1_3,
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
      config: sdkConfigV1_3,
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

  it("should rethrow non-CredentialOfferError from resolve", async () => {
    const unexpectedError = new Error("network failure");
    mockResolveCredentialOffer.mockRejectedValue(unexpectedError);

    await expect(resolveCredentialOffer("some-uri")).rejects.toThrow(
      unexpectedError
    );
  });
});
