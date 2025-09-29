import {
  buildDirectPostBody,
  sendAuthorizationResponse,
  sendAuthorizationErrorResponse,
} from "../03-send-authorization-response";

// Mocks for external modules
import { hasStatusOrThrow } from "../../../utils/misc";
import type { RemotePresentation } from "../types";
// We’ll use Jest’s mocking utilities here.
// Adjust to your project’s actual structure.

jest.mock("../../../wallet-instance-attestation", () => ({
  decode: jest.fn(),
}));

jest.mock("../../../utils/misc", () => ({
  ...jest.requireActual("../../../utils/misc"),
  hasStatusOrThrow: jest.fn(),
}));

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

describe("buildDirectPostBody", () => {
  it("should build the correct formBody string", async () => {
    const mockRequestObject = {
      state: "mock_state",
      nonce: "mock_nonce",
    };

    const mockVpToken = "mock_vp_token";
    const mockPresentationSubmission = { foo: "bar" };

    const result = await buildDirectPostBody(mockRequestObject as any, {
      vp_token: mockVpToken,
      presentation_submission: mockPresentationSubmission,
    });

    // URLSearchParams output should be 'state=mock_state&presentation_submission={"foo":"bar"}&vp_token=mock_vp_token'
    expect(result).toContain("state=mock_state");
    expect(result).toContain("vp_token=mock_vp_token");

    // Because JSON.stringify is used, check approximate structure:
    expect(result).toContain(
      "presentation_submission=%7B%22foo%22%3A%22bar%22%7D"
    );
  });
});

describe("sendAuthorizationResponse", () => {
  let mockFetch: jest.Mock;
  const mockRequestObject = {
    nonce: "mock_nonce",
    response_uri: "https://mock.rp/response",
    scope: "mock_scope",
    state: "mock_state",
    response_mode: "direct_post",
    presentation_definition: {
      id: "mock_presentation_definition_id",
      input_descriptors: [{ id: "mock_descriptor_id" }],
    },
  };
  const mockRemotePresentation = {
    presentations: [
      {
        credentialId: "descriptor1",
        vpToken: "mock_vp_token",
      },
    ] as unknown as RemotePresentation[],
  } as unknown as RemotePresentation;

  beforeEach(() => {
    mockFetch = jest.fn();
    (hasStatusOrThrow as jest.Mock).mockReturnValue(
      (res: Response) => Promise.resolve(res) // pass-through
    );
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ status: "ok", response_code: "200" }),
    });
  });

  it("should use buildDirectPostBody when response_mode is direct_post", async () => {
    const res = await sendAuthorizationResponse(
      mockRequestObject as any,
      mockRemotePresentation,
      { appFetch: mockFetch }
    );

    expect(res).toEqual({ status: "ok", response_code: "200" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://mock.rp/response", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: expect.any(String),
    });
  });

  it("should handle multiple remote presentations by returning an array for vp_token", async () => {
    const directPostJwtRequest = {
      ...mockRequestObject,
      response_mode: "direct_post",
    };
    const multipleRemotePresentations = {
      presentations: [
        ...mockRemotePresentation.presentations,
        {
          credentialId: "descriptor2",
          vpToken: "mock_vp_token2",
        },
      ] as unknown as RemotePresentation[],
    } as unknown as RemotePresentation;

    await sendAuthorizationResponse(
      directPostJwtRequest as any,
      multipleRemotePresentations,
      { appFetch: mockFetch }
    );

    const options = mockFetch.mock.calls[0][1];
    const params = new URLSearchParams(options.body);
    const vpTokenValue = params.get("vp_token");
    expect(JSON.parse(vpTokenValue as string)).toEqual({
      descriptor1 : "mock_vp_token",
      descriptor2 : "mock_vp_token2",
    });
  });
});

describe("sendAuthorizationErrorResponse", () => {
  let mockFetch: jest.Mock;
  const mockRequestObject = {
    nonce: "mock_nonce",
    response_uri: "https://mock.rp/response",
    scope: "mock_scope",
    state: "mock_state",
    response_mode: "direct_post",
    presentation_definition: {
      id: "mock_presentation_definition_id",
      input_descriptors: [{ id: "mock_descriptor_id" }],
    },
  };

  beforeEach(() => {
    mockFetch = jest.fn();
    (hasStatusOrThrow as jest.Mock).mockReturnValue(
      (res: Response) => Promise.resolve(res) // pass-through
    );
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ status: "ok", response_code: "200" }),
    });
  });

  it("should send an error code building the body using buildDirectPostBody", async () => {
    const res = await sendAuthorizationErrorResponse(
      mockRequestObject as any,
      "access_denied",
      { appFetch: mockFetch }
    );

    expect(res).toEqual({ status: "ok", response_code: "200" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("https://mock.rp/response", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `state=mock_state&error=access_denied`,
    });
  });
});
