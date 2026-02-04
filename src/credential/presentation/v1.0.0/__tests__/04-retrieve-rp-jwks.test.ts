// fetchJwks.test.ts

import { getJwksFromRpConfig } from "../04-retrieve-rp-jwks";
import { RelyingPartyConfig } from "../../api/RelyingPartyConfig";

describe("fetchJwksFromConfig", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return JWKS from a valid configuration", () => {
    const mockConfig = {
      keys: [{ kid: "key1" }, { kid: "key2" }],
    } as unknown as RelyingPartyConfig;

    const result = getJwksFromRpConfig(mockConfig);

    // Assertions
    expect(result).toEqual({
      keys: mockConfig.keys,
    });
  });

  it("should throw an error if JWKS is not found in the configuration", () => {
    const mockConfigMissingJWKS = {
      // JWKS is missing here
    } as unknown as RelyingPartyConfig;

    expect(() => getJwksFromRpConfig(mockConfigMissingJWKS)).toThrow(
      "JWKS not found in Relying Party configuration."
    );
  });

  it("should throw an error if JWKS.keys is not an array", async () => {
    const mockConfigInvalidJWKS = {
      keys: "not-an-array",
    } as unknown as RelyingPartyConfig;

    expect(() => getJwksFromRpConfig(mockConfigInvalidJWKS)).toThrow(
      "JWKS not found in Relying Party configuration."
    );
  });
});
