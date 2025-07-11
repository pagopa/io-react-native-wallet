import {
  RelyingPartyResponseError,
  RelyingPartyResponseErrorCodes,
} from "../../../utils/errors";
import {
  buildDirectPostBody,
  buildDirectPostJwtBody,
  sendAuthorizationErrorResponse,
  sendAuthorizationResponse,
} from "../08-send-authorization-response";
import type { RemotePresentation, RequestObject } from "../types";
import type { RelyingPartyEntityConfiguration } from "../../../trust/types";

jest.mock("@pagopa/io-react-native-jwt", () => {
  const actualModule = jest.requireActual("@pagopa/io-react-native-jwt");
  return {
    ...actualModule,
    EncryptJwe: jest.fn().mockImplementation(() => ({
      encrypt: jest.fn().mockResolvedValue("mock_encrypted_jwe"),
    })),
    SignJWT: jest.fn().mockImplementation(() => ({
      setProtectedHeader: jest.fn().mockReturnThis(),
      setPayload: jest.fn().mockReturnThis(),
      setAudience: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue("mock_signed_kbjwt"),
    })),
    sha256ToBase64: jest.fn().mockResolvedValue("mock_encrypted_jwe"),
  };
});

const mockRequestObject: RequestObject = {
  iat: 1234567890,
  exp: 1234567899,
  iss: "https://mock.rp",
  client_id: "mock_client_id",
  response_type: "vp_token",
  nonce: "mock_nonce",
  response_uri: "https://mock.rp/response",
  scope: "mock_scope",
  state: "mock_state",
  response_mode: "direct_post.jwt",
  dcql_query: {
    credentials: [
      {
        id: "PID",
        format: "dc+sd-jwt",
        meta: { vct_values: ["PersonIdentificationData"] },
      },
    ],
  },
};

const mockRpConf = {
  openid_credential_verifier: {
    jwks: {
      keys: [
        { kid: "rsa-key-1", use: "enc", kty: "RSA" },
        { kid: "something-else", use: "sig", kty: "EC" },
      ],
    },
  },
} as RelyingPartyEntityConfiguration["payload"]["metadata"];

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
  const remotePresentations: RemotePresentation[] = [
    {
      requestedClaims: ["name", "surname"],
      credentialId: "PID",
      vpToken: "mock_vp_token",
    },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should use buildDirectPostJwtBody when response_mode is direct_post.jwt", async () => {
    mockFetch.mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      json: () => Promise.resolve({ status: "ok", response_code: "200" }),
    });

    await sendAuthorizationResponse(
      mockRequestObject,
      remotePresentations,
      mockRpConf,
      { appFetch: mockFetch }
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://mock.rp/response", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "response=mock_encrypted_jwe&state=mock_state",
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
        status,
        json: () => Promise.resolve(""),
      });

      try {
        await sendAuthorizationResponse(
          mockRequestObject,
          remotePresentations,
          mockRpConf,
          { appFetch: mockFetch }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(RelyingPartyResponseError);
        expect((error as RelyingPartyResponseError).code).toEqual(errorCode);
      }
    }
  );
});

describe("sendAuthorizationErrorResponse", () => {
  it("should send an error code building the body using buildDirectPostBody", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      status: 200,
      json: () => Promise.resolve({ status: "ok", response_code: "200" }),
    });

    const res = await sendAuthorizationErrorResponse(
      mockRequestObject,
      {
        error: "access_denied",
        errorDescription: "an_error_occurred",
      },
      { appFetch: mockFetch }
    );

    expect(res).toEqual({ status: "ok", response_code: "200" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://mock.rp/response", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "state=mock_state&error=access_denied&error_description=an_error_occurred",
    });
  });
});
