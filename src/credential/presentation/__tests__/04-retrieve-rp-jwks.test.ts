// fetchJwks.test.ts

import { fetchJwksFromUri, fetchJwksFromConfig } from "../04-retrieve-rp-jwks";

import { JWKS } from "../../../utils/jwk";
import { RelyingPartyEntityConfiguration } from "../../../entity/trust/types";

// Mock the JWKS and JWK utilities
jest.mock("../../../utils/jwk", () => ({
  JWKS: {
    parse: jest.fn(),
  },
}));

// Mock the RelyingPartyEntityConfiguration
jest.mock("../../../entity/trust/types", () => ({
  RelyingPartyEntityConfiguration: {
    safeParse: jest.fn(),
  },
}));

// Type assertion for mocked functions
const mockedJWKSParse = JWKS.parse as jest.Mock;

describe("fetchJwksFromUri", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Mock the global fetch
    global.fetch = jest.fn();
  });

  it("should successfully fetch JWKS using the global fetch", async () => {
    const mockJwksResponse = { keys: [{ kid: "key1" }] } as JWKS;

    mockedJWKSParse.mockReturnValue(mockJwksResponse);

    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue(mockJwksResponse),
    });

    const issUrl = new URL("https://client.example.com");
    const issUrlJwk = new URL("/jwk", issUrl.toString());
    const result = await fetchJwksFromUri(issUrlJwk, {});

    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      `${issUrl.toString()}.well-known/jar-issuer/jwk`,
      { method: "GET" }
    );
    expect(mockedJWKSParse).toHaveBeenCalledWith(mockJwksResponse);
    expect(result).toEqual({ keys: mockJwksResponse.keys });
  });

  it("should use a custom fetch function if provided", async () => {
    const mockJwksResponse = { keys: [{ kid: "key2" }] } as JWKS;
    const customFetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue(mockJwksResponse),
    });

    mockedJWKSParse.mockReturnValue(mockJwksResponse);

    const issUrl = new URL("https://client.example.com");
    const issUrlJwk = new URL("/jwk", issUrl.toString());
    const result = await fetchJwksFromUri(issUrlJwk, {
      context: { appFetch: customFetch },
    });

    // Assertions
    expect(customFetch).toHaveBeenCalledWith(
      `${issUrl.toString()}.well-known/jar-issuer/jwk`,
      { method: "GET" }
    );
    expect(mockedJWKSParse).toHaveBeenCalledWith(mockJwksResponse);
    expect(result).toEqual({ keys: mockJwksResponse.keys });
  });

  it("should throw an error if the fetch fails", async () => {
    const customFetch = jest.fn().mockRejectedValue(new Error("Network error"));

    const issUrl = new URL("https://client.example.com");
    const issUrlJwk = new URL("/jwk", issUrl.toString());
    await expect(
      fetchJwksFromUri(issUrlJwk, { context: { appFetch: customFetch } })
    ).rejects.toThrow("Network error");

    // Assertions
    expect(customFetch).toHaveBeenCalledWith(
      `${issUrl.toString()}.well-known/jar-issuer/jwk`,
      { method: "GET" }
    );
  });

  it("should throw an error if the response status is not 200", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 404,
      json: jest.fn(),
      headers: {
        get: jest.fn(),
      },
      text: jest.fn(),
    });

    const issUrl = new URL("https://client.example.com");
    const issUrlJwk = new URL("/jwk", issUrl.toString());
    await expect(fetchJwksFromUri(issUrlJwk, {})).rejects.toThrow(
      /Expected 200, got 404/
    );

    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      `${issUrl.toString()}.well-known/jar-issuer/jwk`,
      { method: "GET" }
    );
  });
});

describe("fetchJwksFromConfig", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return JWKS from a valid configuration", async () => {
    const mockConfig = {
      wallet_relying_party: {
        jwks: { keys: [{ kid: "key1" }, { kid: "key2" }] },
      },
    };

    const result = await fetchJwksFromConfig(
      mockConfig as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"]
    );

    // Assertions
    expect(result).toEqual({
      keys: mockConfig.wallet_relying_party.jwks.keys,
    });
  });

  it("should throw an error if JWKS is not found in the configuration", async () => {
    const mockConfigMissingJWKS = {
      wallet_relying_party: {
        // JWKS is missing here
      },
    };

    await expect(
      fetchJwksFromConfig(
        mockConfigMissingJWKS as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"]
      )
    ).rejects.toThrow("JWKS not found in Relying Party configuration.");
  });

  it("should throw an error if JWKS.keys is not an array", async () => {
    const mockConfigInvalidJWKS = {
      wallet_relying_party: {
        jwks: { keys: "not-an-array" },
      },
    };

    await expect(
      fetchJwksFromConfig(
        mockConfigInvalidJWKS as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"]
      )
    ).rejects.toThrow("JWKS not found in Relying Party configuration.");
  });
});
