import type { RelyingPartyConfig } from "../../api/RelyingPartyConfig";
import type { RemotePresentation, RequestObject } from "../../api/types";

import {
  buildDirectPostJwtBody,
  sendAuthorizationErrorResponse,
  sendAuthorizationResponse,
} from "../07-send-authorization-response";
import {
  IoWalletError,
  RelyingPartyResponseError,
  RelyingPartyResponseErrorCodes,
} from "../../../../utils/errors";
import { buildDirectPostBody } from "../../common/utils/http";

jest.mock("@pagopa/io-react-native-jwt", () => {
  const actualModule = jest.requireActual("@pagopa/io-react-native-jwt");
  return {
    ...actualModule,
    EncryptJwe: jest.fn().mockImplementation(() => ({
      encrypt: jest.fn().mockResolvedValue("mock_encrypted_jwe"),
    })),
    sha256ToBase64: jest.fn().mockResolvedValue("mock_encrypted_jwe"),
    SignJWT: jest.fn().mockImplementation(() => ({
      setAudience: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setPayload: jest.fn().mockReturnThis(),
      setProtectedHeader: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue("mock_signed_kbjwt"),
    })),
  };
});

const mockRequestObject: RequestObject = {
  client_id: "mock_client_id",
  dcql_query: {
    credentials: [
      {
        format: "dc+sd-jwt",
        id: "PID",
        meta: { vct_values: ["PersonIdentificationData"] },
      },
    ],
  },
  iss: "https://mock.rp",
  nonce: "mock_nonce",
  response_mode: "direct_post.jwt",
  response_type: "vp_token",
  response_uri: "https://mock.rp/response",
  state: "mock_state",
};

const mockRpConf: RelyingPartyConfig = {
  federation_entity: {},
  jwks: {
    keys: [
      { kid: "rsa-key-1", kty: "RSA", use: "enc" },
      { kid: "something-else", kty: "EC", use: "sig" },
    ],
  },
  subject: "mock_client_id",
};

describe("buildDirectPostBody", () => {
  it("should build the correct formBody string", async () => {
    const mockVpToken = "mock_vp_token";

    const result = await buildDirectPostBody(mockRequestObject, {
      vp_token: { PID: mockVpToken },
    });

    // URLSearchParams output should be 'state=mock_state&vp_token={"PID":"mock_vp_token"}'
    expect(result).toContain("state=mock_state");
    // Because JSON.stringify is used, check approximate structure:
    expect(result).toContain("vp_token=%7B%22PID%22%3A%22mock_vp_token%22%7D");
  });
});

describe("buildDirectPostJwtBody", () => {
  it("should build the correct formBody string", async () => {
    const mockVpToken = "mock_vp_token";

    const result = await buildDirectPostJwtBody(mockRequestObject, mockRpConf, {
      vp_token: { PID: mockVpToken },
    });

    expect(result).toBe("response=mock_encrypted_jwe&state=mock_state");
  });
});

describe("sendAuthorizationResponse", () => {
  const mockFetch = jest.fn();
  const remotePresentations: RemotePresentation = {
    presentations: [
      {
        credentialId: "PID",
        format: "dc+sd-jwt",
        requestedClaims: ["name", "surname"],
        vpToken: "mock_vp_token",
      },
    ],
  };
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should use buildDirectPostJwtBody when response_mode is direct_post.jwt", async () => {
    mockFetch.mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ response_code: "200", status: "ok" }),
      status: 200,
    });

    await sendAuthorizationResponse(
      mockRequestObject,
      remotePresentations,
      mockRpConf,
      { appFetch: mockFetch },
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://mock.rp/response", {
      body: "response=mock_encrypted_jwe&state=mock_state",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
  });

  test.each([
    [RelyingPartyResponseErrorCodes.InvalidAuthorizationResponse, 400],
    [RelyingPartyResponseErrorCodes.InvalidAuthorizationResponse, 403],
    [RelyingPartyResponseErrorCodes.RelyingPartyGenericError, 500],
  ])(
    "should throw RelyingPartyResponseError with code %s when the HTTP status is %s",
    async (errorCode, status) => {
      mockFetch.mockResolvedValue({
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(""),
        status,
      });

      try {
        await sendAuthorizationResponse(
          mockRequestObject,
          remotePresentations,
          mockRpConf,
          { appFetch: mockFetch },
        );
      } catch (error) {
        expect(error).toBeInstanceOf(RelyingPartyResponseError);
        expect((error as RelyingPartyResponseError).code).toEqual(errorCode);
      }
    },
  );

  it("should throw if no Relying Party configuration is provided", async () => {
    await expect(() =>
      sendAuthorizationResponse(mockRequestObject, remotePresentations),
    ).rejects.toThrow(IoWalletError);
  });
});

describe("sendAuthorizationErrorResponse", () => {
  it("should send an error code building the body using buildDirectPostBody", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ response_code: "200", status: "ok" }),
      status: 200,
    });

    const res = await sendAuthorizationErrorResponse(
      mockRequestObject,
      {
        error: "access_denied",
        errorDescription: "an_error_occurred",
      },
      { appFetch: mockFetch },
    );

    expect(res).toEqual({ response_code: "200", status: "ok" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://mock.rp/response", {
      body: "state=mock_state&error=access_denied&error_description=an_error_occurred",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
  });
});
