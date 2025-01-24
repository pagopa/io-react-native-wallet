import {
  chooseRSAPublicKeyToEncrypt,
  prepareVpToken,
  buildDirectPostBody,
  buildDirectPostJwtBody,
  sendAuthorizationResponse,
} from "../08-send-authorization-response";
import { NoSuitableKeysFoundInEntityConfiguration } from "../errors";

// Mocks for external modules
import { disclose } from "../../../sd-jwt";
import { hasStatusOrThrow } from "../../../utils/misc";
import type { PresentationDefinition, RequestObject } from "../types";
// We’ll use Jest’s mocking utilities here.
// Adjust to your project’s actual structure.

jest.mock("../../../sd-jwt", () => ({
  disclose: jest.fn(),
}));

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

describe("chooseRSAPublicKeyToEncrypt", () => {
  it("should choose the first RSA key with 'enc' use from the list", () => {
    const mockKeys = [
      { kid: "not-an-rsa-key", use: "sig", kty: "EC" },
      { kid: "rsa-key-1", use: "enc", kty: "RSA" },
      { kid: "rsa-key-2", use: "enc", kty: "RSA" },
    ];

    const chosenKey = chooseRSAPublicKeyToEncrypt(mockKeys as any);
    expect(chosenKey).toEqual(mockKeys[1]);
  });

  it("should throw NoSuitableKeysFoundInEntityConfiguration if no RSA 'enc' key is found", () => {
    const mockKeys = [
      { kid: "key-1", use: "sig", kty: "EC" },
      { kid: "key-2", use: "enc", kty: "EC" },
    ];

    expect(() => chooseRSAPublicKeyToEncrypt(mockKeys as any)).toThrow(
      NoSuitableKeysFoundInEntityConfiguration
    );
  });
});

describe("prepareVpToken", () => {
  const mockRequestObject = {
    nonce: "mock_nonce",
    response_uri: "https://mock.rp/response",
    scope: "mock_scope",
    presentation_definition: {
      id: "mock_presentation_definition_id",
      input_descriptors: [{ id: "mock_descriptor_id" }],
    },
  } as unknown as RequestObject;

  const mockPresentationDefinition = {
    id: "mock_presentation_definition_id",
    input_descriptors: {
      id: "mock_input_descriptor_id",
    },
  } as unknown as PresentationDefinition;

  const mockPresentation: any = [
    { vc: "mock_vc" }, // Simplified; actual code expects [vc, claims, cryptCtx]
    { claims: "mock_claims" },
    {
      getPublicKey: jest.fn().mockResolvedValue({ kid: "mock_kid" }),
    },
  ];

  beforeEach(() => {
    (disclose as jest.Mock).mockResolvedValue({ token: "mock_disclosed_vp" });
  });

  it("should return a vp_token and presentation_submission", async () => {
    const result = await prepareVpToken(
      mockRequestObject,
      mockPresentationDefinition,
      mockPresentation
    );

    expect(disclose).toHaveBeenCalledWith(
      mockPresentation[0],
      mockPresentation[1]
    );

    // Check the shape of the returned object
    expect(result).toHaveProperty(
      "vp_token",
      "mock_disclosed_vp~mock_signed_kbjwt"
    );
    expect(result).toHaveProperty("presentation_submission");
    expect(result.presentation_submission).toHaveProperty("id");
    expect(result.presentation_submission).toHaveProperty(
      "definition_id",
      mockRequestObject.presentation_definition?.id
    );
    expect(result.presentation_submission).toHaveProperty("descriptor_map");
  });
});

describe("buildDirectPostBody", () => {
  it("should build the correct formBody string", async () => {
    const mockRequestObject = {
      state: "mock_state",
      nonce: "mock_nonce",
    };

    const mockVpToken = "mock_vp_token";
    const mockPresentationSubmission = { foo: "bar" };

    const result = await buildDirectPostBody(
      mockRequestObject as any,
      mockVpToken,
      mockPresentationSubmission
    );

    // URLSearchParams output should be 'state=mock_state&presentation_submission={"foo":"bar"}&vp_token=mock_vp_token'
    expect(result).toContain("state=mock_state");
    expect(result).toContain("vp_token=mock_vp_token");

    // Because JSON.stringify is used, check approximate structure:
    expect(result).toContain(
      "presentation_submission=%7B%22foo%22%3A%22bar%22%7D"
    );
  });
});

describe("buildDirectPostJwtBody", () => {
  const mockRpJwKeys: any = [
    { kid: "rsa-key-1", use: "enc", kty: "RSA" },
    { kid: "something-else", use: "sig", kty: "EC" },
  ];

  it("should build the correct formBody string", async () => {
    const mockRequestObject = {
      state: "mock_state",
      nonce: "mock_nonce",
    };

    const mockVpToken = "mock_vp_token";
    const mockPresentationSubmission = { foo: "bar" };

    const result = await buildDirectPostJwtBody(
      mockRpJwKeys,
      mockRequestObject as any,
      mockVpToken,
      mockPresentationSubmission
    );

    // Should call chooseRSAPublicKeyToEncrypt and produce a "response=mock_encrypted_jwe"
    expect(result).toBe("response=mock_encrypted_jwe");
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
  const mockPresentationDefinition = {
    id: "mock_presentation_definition_id",
    input_descriptors: {
      id: "mock_input_descriptor_id",
    },
  } as unknown as PresentationDefinition;
  const mockRpJwKeys: any = [{ kid: "rsa-key-enc", use: "enc", kty: "RSA" }];
  const mockPresentation: any = [
    "mock_vc",
    "mock_claims",
    { getPublicKey: jest.fn().mockResolvedValue({ kid: "mock_kid" }) },
  ];

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
      mockPresentationDefinition,
      mockRpJwKeys,
      mockPresentation,
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

  it("should use buildDirectPostJwtBody when response_mode is direct_post.jwt", async () => {
    const directPostJwtRequest = {
      ...mockRequestObject,
      response_mode: "direct_post.jwt",
    };

    await sendAuthorizationResponse(
      directPostJwtRequest as any,
      mockPresentationDefinition,
      mockRpJwKeys,
      mockPresentation,
      { appFetch: mockFetch }
    );

    // Expect that the returned body is "response=mock_encrypted_jwe"
    const [[, { body }]] = mockFetch.mock.calls;
    expect(body).toContain("response=mock_encrypted_jwe");
  });
});
