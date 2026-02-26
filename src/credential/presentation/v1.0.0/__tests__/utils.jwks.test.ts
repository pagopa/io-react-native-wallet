import { RelyingPartyConfig } from "../../api/RelyingPartyConfig";
import { getJwksFromRpConfig } from "../utils.jwks";

describe("fetchJwksFromConfig", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return JWKS from a valid configuration", () => {
    const mockConfig = {
      jwks: {
        keys: [
          { kty: "RSA", kid: "key1" },
          { kty: "EC", kid: "key2" },
        ],
      },
    } as unknown as RelyingPartyConfig;

    const result = getJwksFromRpConfig(mockConfig);

    expect(result).toEqual({
      keys: mockConfig.jwks.keys,
    });
  });

  it("should throw an error if JWKS is not found in the configuration", () => {
    const mockConfigMissingJWKS = {
      jwks: {},
    } as unknown as RelyingPartyConfig;

    expect(() => getJwksFromRpConfig(mockConfigMissingJWKS)).toThrow(
      "JWKS not found in Relying Party configuration."
    );
  });

  it("should throw an error if JWKS.keys is not an array", async () => {
    const mockConfigInvalidJWKS = {
      jwks: { keys: "not-an-array" },
    } as unknown as RelyingPartyConfig;

    expect(() => getJwksFromRpConfig(mockConfigInvalidJWKS)).toThrow(
      "JWKS not found in Relying Party configuration."
    );
  });
});
