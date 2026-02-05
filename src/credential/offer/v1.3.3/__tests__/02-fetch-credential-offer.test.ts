import { fetchCredentialOffer } from "../02-fetch-credential-offer";
import { InvalidCredentialOfferError } from "../../common/errors";
import type { CredentialOffer } from "../../api/types";

const validCredentialOffer: CredentialOffer = {
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

const validPreAuthorizedCredentialOffer: CredentialOffer = {
  credential_issuer: "https://issuer.example.com",
  credential_configuration_ids: ["UniversityDegreeCredential"],
  grants: {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "adhjhdjajkdkhjhdj",
      tx_code: {
        length: 4,
        input_mode: "numeric",
        description:
          "Please provide the one-time code that was sent via e-mail",
      },
    },
  },
};

// Minimal valid offer according to the current schema:
// - `credential_configuration_ids` must be non-empty
// - `grants` is required (at least one supported grant)
const minimalCredentialOffer: CredentialOffer = {
  credential_issuer: "https://issuer.example.com",
  credential_configuration_ids: ["org.iso.18013.5.1.mDL"],
  grants: {
    authorization_code: {
      scope: "test-scope",
    },
  },
};

const mockFetch = jest.fn();

const context = {
  appFetch: mockFetch,
};

describe("fetchCredentialOffer", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should fetch and validate a credential offer with authorization code", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(validCredentialOffer),
    });

    const result = await fetchCredentialOffer(
      "https://issuer.example.com/offer",
      context
    );

    expect(mockFetch).toHaveBeenCalledWith("https://issuer.example.com/offer", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    expect(result).toEqual(validCredentialOffer);
  });

  it("should fetch and validate a credential offer with pre-authorized code", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(validPreAuthorizedCredentialOffer),
    });

    const result = await fetchCredentialOffer(
      "https://issuer.example.com/offer",
      context
    );

    expect(result).toEqual(validPreAuthorizedCredentialOffer);
  });

  it("should fetch and validate a minimal credential offer", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(minimalCredentialOffer),
    });

    const result = await fetchCredentialOffer(
      "https://issuer.example.com/offer",
      context
    );

    expect(result).toEqual(minimalCredentialOffer);
  });

  it("should throw an error for invalid JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    await expect(
      fetchCredentialOffer("https://issuer.example.com/offer", context)
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
      fetchCredentialOffer("https://issuer.example.com/offer", context)
    ).rejects.toThrow(InvalidCredentialOfferError);
  });

  it("should throw InvalidCredentialOfferError for empty credential_configuration_ids", async () => {
    const invalidOffer = {
      ...validCredentialOffer,
      credential_configuration_ids: [],
    };
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(invalidOffer),
    });

    await expect(
      fetchCredentialOffer("https://issuer.example.com/offer", context)
    ).rejects.toThrow(InvalidCredentialOfferError);
  });

  it("should throw InvalidCredentialOfferError for invalid URL", async () => {
    const invalidOffer = {
      ...validCredentialOffer,
      credential_issuer: "not-a-url",
    };
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve(invalidOffer),
    });

    await expect(
      fetchCredentialOffer("https://issuer.example.com/offer", context)
    ).rejects.toThrow(InvalidCredentialOfferError);
  });
});
