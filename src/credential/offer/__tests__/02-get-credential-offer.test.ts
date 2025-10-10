import { getCredentialOffer } from "../02-get-credential-offer";
import { InvalidCredentialOfferError } from "../errors";
import type { CredentialOffer } from "../types";

const validCredentialOffer: CredentialOffer = {
  credential_issuer: "https://issuer.example.com",
  credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
  grants: {
    authorization_code: {
      issuer_state: "some-issuer-state",
      authorization_server: "https://auth.example.com",
    },
  },
};

const mockFetch = jest.fn();

const context = {
  appFetch: mockFetch,
};

describe("getCredentialOffer", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should fetch and validate a credential offer", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(validCredentialOffer),
    });

    const result = await getCredentialOffer(
      "https://issuer.example.com/offer",
      context
    );

    expect(mockFetch).toHaveBeenCalledWith("https://issuer.example.com/offer", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    expect(result).toEqual(validCredentialOffer);
  });

  it("should throw an error for invalid JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    await expect(
      getCredentialOffer("https://issuer.example.com/offer", context)
    ).rejects.toThrow("Invalid JSON");
  });

  it("should throw InvalidCredentialOfferError for schema mismatch", async () => {
    const invalidOffer = {
      ...validCredentialOffer,
      credential_configuration_ids: "wrong",
    };
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(invalidOffer),
    });

    await expect(
      getCredentialOffer("https://issuer.example.com/offer", context)
    ).rejects.toThrow(InvalidCredentialOfferError);
  });
});
