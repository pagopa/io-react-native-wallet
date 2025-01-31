// fetchJwks.test.ts

import {
  fetchJwksFromRequestObject,
  fetchJwksFromConfig,
} from "../04-retrieve-rp-jwks";

import { JWKS, JWK } from "../../../utils/jwk";
import { RelyingPartyEntityConfiguration } from "../../../entity/trust/types";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { NoSuitableKeysFoundInEntityConfiguration } from "../errors";
import { RequestObject } from "../types";

beforeEach(() => {
  jest.spyOn(JWKS, "parse").mockImplementation(jest.fn());
  jest.spyOn(JWK, "parse").mockImplementation(jest.fn());
  jest.spyOn(RequestObject, "parse").mockImplementation(jest.fn());
});

// Mock the RelyingPartyEntityConfiguration
jest.mock("../../../entity/trust/types", () => ({
  RelyingPartyEntityConfiguration: {
    safeParse: jest.fn(),
  },
}));

jest.mock("@pagopa/io-react-native-jwt", () => ({ decode: jest.fn() }));

describe("fetchJwksFromRequestObject", () => {
  const mockRequestObject = {} as unknown as RequestObject;

  beforeEach(() => {
    jest.clearAllMocks();

    (RequestObject.parse as jest.Mock).mockImplementation(
      (_) => mockRequestObject
    );
  });

  it("returns keys from protected header when JWT contains jwk attribute", async () => {
    const sampleJwk = { kty: "RSA", kid: "abc" };
    (decodeJwt as jest.Mock).mockReturnValue({
      protectedHeader: { jwk: sampleJwk },
      payload: {},
    });
    (JWK.parse as jest.Mock).mockImplementation((key) => key);

    const result = await fetchJwksFromRequestObject("dummyJwt", {});
    expect(result.keys).toEqual([sampleJwk]);
  });

  it("retrieves keys from well-known URL when iss claim is present", async () => {
    const fakeIss = "https://example.com/path";
    const sampleJwk = { kty: "EC", kid: "xyz" };
    (decodeJwt as jest.Mock).mockReturnValue({
      protectedHeader: {},
      payload: { iss: fakeIss },
    });

    const fakeJwksResponse = { jwks: { keys: [sampleJwk] } };
    const fakeFetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => fakeJwksResponse,
    });

    (JWKS.parse as jest.Mock).mockImplementation((json) => json);

    const context = { appFetch: fakeFetch };
    const result = await fetchJwksFromRequestObject("dummyJwt", { context });

    expect(fakeFetch).toHaveBeenCalled();
    expect(result.keys).toEqual([sampleJwk]);
  });

  it("throws NoSuitableKeysFoundInEntityConfiguration error when no jwk and no iss found", async () => {
    (decodeJwt as jest.Mock).mockReturnValue({
      protectedHeader: {},
      payload: {},
    });

    await expect(fetchJwksFromRequestObject("dummyJwt", {})).rejects.toThrow(
      NoSuitableKeysFoundInEntityConfiguration
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
