// fetchJwks.test.ts

import { getJwksFromConfig } from "../04-retrieve-rp-jwks";
import { RelyingPartyEntityConfiguration } from "../../../trust/types";

// Mock the RelyingPartyEntityConfiguration
jest.mock("../../../trust/types", () => ({
  RelyingPartyEntityConfiguration: {
    safeParse: jest.fn(),
  },
}));

jest.mock("@pagopa/io-react-native-jwt", () => ({ decode: jest.fn() }));

describe("fetchJwksFromConfig", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return JWKS from a valid configuration", () => {
    const mockConfig = {
      openid_credential_verifier: {
        jwks: { keys: [{ kid: "key1" }, { kid: "key2" }] },
      },
    };

    const result = getJwksFromConfig(
      mockConfig as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"]
    );

    // Assertions
    expect(result).toEqual({
      keys: mockConfig.openid_credential_verifier.jwks.keys,
    });
  });

  it("should throw an error if JWKS is not found in the configuration", () => {
    const mockConfigMissingJWKS = {
      openid_credential_verifier: {
        // JWKS is missing here
      },
    };

    expect(() =>
      getJwksFromConfig(
        mockConfigMissingJWKS as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"]
      )
    ).toThrow("JWKS not found in Relying Party configuration.");
  });

  it("should throw an error if JWKS.keys is not an array", async () => {
    const mockConfigInvalidJWKS = {
      openid_credential_verifier: {
        jwks: { keys: "not-an-array" },
      },
    };

    expect(() =>
      getJwksFromConfig(
        mockConfigInvalidJWKS as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"]
      )
    ).toThrow("JWKS not found in Relying Party configuration.");
  });
});
