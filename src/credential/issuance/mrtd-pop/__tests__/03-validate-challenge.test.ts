import {
  validateChallenge,
  buildChallengeCallbackUrl,
} from "../03-validate-challenge";
import { IssuerResponseError } from "../../../../utils/errors";
import type { Out } from "../../../../utils/misc";
import type { EvaluateIssuerTrust } from "../../02-evaluate-issuer-trust";
import type { MrtdPayload, IasPayload } from "../types";

// Mock dependencies
jest.mock("../../../../utils/pop", () => ({
  createPopToken: jest.fn().mockResolvedValue("signed-wia-pop-token"),
}));

jest.mock("../../../../wallet-instance-attestation", () => ({
  decode: jest.fn().mockReturnValue({
    payload: { cnf: { jwk: { kid: "wia-key-id" } } },
  }),
}));

// Provide a deterministic uuid
jest.mock("uuid", () => ({ v4: () => "fixed-jti" }));

// Mock SignJWT from @pagopa/io-react-native-jwt
const mockSign = jest.fn().mockResolvedValue("signed-mrtd-validation-jwt");
const mockSetExpirationTime = jest.fn().mockReturnValue({ sign: mockSign });
const mockSetIssuedAt = jest
  .fn()
  .mockReturnValue({ setExpirationTime: mockSetExpirationTime });
const mockSetPayload = jest
  .fn()
  .mockReturnValue({ setIssuedAt: mockSetIssuedAt });
const mockSetProtectedHeader = jest
  .fn()
  .mockReturnValue({ setPayload: mockSetPayload });

jest.mock("@pagopa/io-react-native-jwt", () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: mockSetProtectedHeader,
  })),
}));

// Minimal issuer configuration
const issuerConf = {
  openid_credential_issuer: {
    credential_issuer: "https://issuer.example/credential_issuer",
  },
} as unknown as Out<EvaluateIssuerTrust>["issuerConf"];

// Mock MRTD and IAS payloads
const mrtdPayload: MrtdPayload = {
  dg1: "base64-encoded-dg1",
  dg11: "base64-encoded-dg11",
  sod_mrtd: "base64-encoded-sod-mrtd",
};

const iasPayload: IasPayload = {
  ias_pk: "base64-encoded-ias-pk",
  sod_ias: "base64-encoded-sod-ias",
  challenge_signed: "base64-encoded-challenge-signed",
};

// Mock WIA crypto context with getPublicKey method
const wiaCryptoContext = {
  getPublicKey: jest.fn().mockResolvedValue({ kid: "crypto-kid" }),
} as any;

describe("validateChallenge", () => {
  const verifyUrl = "https://issuer.example/mrtd/verify";
  const mrtd_auth_session = "auth-session-id";
  const mrtd_pop_nonce = "pop-nonce-value";
  const walletInstanceAttestation = "attestation-jwt";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates the MRTD challenge and returns the verification result", async () => {
    const mockVerificationResult = {
      status: "require_interaction" as const,
      type: "redirect_to_web" as const,
      mrtd_val_pop_nonce: "validation-nonce",
      redirect_uri: "https://issuer.example/redirect",
    };

    const appFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockVerificationResult), {
        status: 202,
        headers: { "content-type": "application/json" },
      })
    );

    const result = await validateChallenge(
      issuerConf,
      verifyUrl,
      mrtd_auth_session,
      mrtd_pop_nonce,
      mrtdPayload,
      iasPayload,
      { wiaCryptoContext, walletInstanceAttestation, appFetch }
    );

    // Verify the result matches the expected verification result
    expect(result).toEqual(mockVerificationResult);

    // Ensure fetch is called with correct arguments
    expect(appFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = appFetch.mock.calls[0];
    expect(calledUrl).toBe(verifyUrl);
    expect(options.method).toBe("POST");
    expect(options.headers["OAuth-Client-Attestation"]).toBe(
      walletInstanceAttestation
    );
    expect(options.headers["OAuth-Client-Attestation-PoP"]).toBe(
      "signed-wia-pop-token"
    );
    expect(options.headers["Content-Type"]).toBe("application/json");

    const requestBody = JSON.parse(options.body);
    expect(requestBody).toEqual({
      mrtd_validation_jwt: "signed-mrtd-validation-jwt",
      mrtd_auth_session,
      mrtd_pop_nonce,
    });

    // Validate createPopToken was invoked with expected claims
    const { createPopToken } = require("../../../../utils/pop");
    expect(createPopToken).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: "fixed-jti",
        aud: "https://issuer.example/credential_issuer",
        iss: "wia-key-id",
      }),
      wiaCryptoContext
    );
  });

  it("creates the MRTD validation JWT with correct structure", async () => {
    const mockVerificationResult = {
      status: "require_interaction" as const,
      type: "redirect_to_web" as const,
      mrtd_val_pop_nonce: "validation-nonce",
      redirect_uri: "https://issuer.example/redirect",
    };

    const appFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(mockVerificationResult), {
        status: 202,
      })
    );

    await validateChallenge(
      issuerConf,
      verifyUrl,
      mrtd_auth_session,
      mrtd_pop_nonce,
      mrtdPayload,
      iasPayload,
      { wiaCryptoContext, walletInstanceAttestation, appFetch }
    );

    // Verify SignJWT was called with correct parameters
    expect(mockSetProtectedHeader).toHaveBeenCalledWith({
      typ: "mrtd-ias+jwt",
      kid: "crypto-kid",
    });

    expect(mockSetPayload).toHaveBeenCalledWith({
      iss: "wia-key-id",
      aud: "https://issuer.example/credential_issuer",
      document_type: "cie",
      mrtd: mrtdPayload,
      ias: iasPayload,
    });

    expect(mockSetIssuedAt).toHaveBeenCalled();
    expect(mockSetExpirationTime).toHaveBeenCalledWith("5m");
    expect(mockSign).toHaveBeenCalled();
  });

  it("throws IssuerResponseError when status code is not 202", async () => {
    const appFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );

    try {
      await validateChallenge(
        issuerConf,
        verifyUrl,
        mrtd_auth_session,
        mrtd_pop_nonce,
        mrtdPayload,
        iasPayload,
        { wiaCryptoContext, walletInstanceAttestation, appFetch }
      );
      fail("Should have thrown IssuerResponseError");
    } catch (err) {
      expect(err).toBeInstanceOf(IssuerResponseError);
      const e = err as IssuerResponseError;
      expect(e.statusCode).toBe(400);
    }
  });

  it("throws an error when the response doesn't match MrtdPopVerificationResult schema", async () => {
    const invalidResponse = {
      status: "invalid_status",
      type: "redirect_to_web",
    };

    const appFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), {
        status: 202,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(
      validateChallenge(
        issuerConf,
        verifyUrl,
        mrtd_auth_session,
        mrtd_pop_nonce,
        mrtdPayload,
        iasPayload,
        { wiaCryptoContext, walletInstanceAttestation, appFetch }
      )
    ).rejects.toThrow();
  });

  it("uses provided appFetch implementation", async () => {
    const mockVerificationResult = {
      status: "require_interaction" as const,
      type: "redirect_to_web" as const,
      mrtd_val_pop_nonce: "validation-nonce",
      redirect_uri: "https://issuer.example/redirect",
    };

    const customFetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockVerificationResult), { status: 202 })
      );

    await validateChallenge(
      issuerConf,
      verifyUrl,
      mrtd_auth_session,
      mrtd_pop_nonce,
      mrtdPayload,
      iasPayload,
      { wiaCryptoContext, walletInstanceAttestation, appFetch: customFetch }
    );

    expect(customFetch).toHaveBeenCalled();
  });

  it("uses default fetch when appFetch is not provided", async () => {
    const mockVerificationResult = {
      status: "require_interaction" as const,
      type: "redirect_to_web" as const,
      mrtd_val_pop_nonce: "validation-nonce",
      redirect_uri: "https://issuer.example/redirect",
    };

    // Mock global fetch
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockVerificationResult), { status: 202 })
      ) as jest.Mock;

    await validateChallenge(
      issuerConf,
      verifyUrl,
      mrtd_auth_session,
      mrtd_pop_nonce,
      mrtdPayload,
      iasPayload,
      { wiaCryptoContext, walletInstanceAttestation }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      verifyUrl,
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("retrieves public key from crypto context", async () => {
    const mockVerificationResult = {
      status: "require_interaction" as const,
      type: "redirect_to_web" as const,
      mrtd_val_pop_nonce: "validation-nonce",
      redirect_uri: "https://issuer.example/redirect",
    };

    const appFetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(mockVerificationResult), { status: 202 })
      );

    await validateChallenge(
      issuerConf,
      verifyUrl,
      mrtd_auth_session,
      mrtd_pop_nonce,
      mrtdPayload,
      iasPayload,
      { wiaCryptoContext, walletInstanceAttestation, appFetch }
    );

    expect(wiaCryptoContext.getPublicKey).toHaveBeenCalled();
  });
});

describe("buildChallengeCallbackUrl", () => {
  it("builds the callback URL with correct query parameters", async () => {
    const redirectUri = "https://issuer.example/callback";
    const valPopNonce = "validation-nonce-123";
    const authSession = "auth-session-456";

    const result = await buildChallengeCallbackUrl(
      redirectUri,
      valPopNonce,
      authSession
    );

    expect(result.callbackUrl).toBe(
      "https://issuer.example/callback?mrtd_val_pop_nonce=validation-nonce-123&mrtd_auth_session=auth-session-456"
    );
  });

  it("properly encodes URL parameters", async () => {
    const redirectUri = "https://issuer.example/callback";
    const valPopNonce = "nonce with spaces";
    const authSession = "session&special=chars";

    const result = await buildChallengeCallbackUrl(
      redirectUri,
      valPopNonce,
      authSession
    );

    const url = new URL(result.callbackUrl);
    expect(url.searchParams.get("mrtd_val_pop_nonce")).toBe(
      "nonce with spaces"
    );
    expect(url.searchParams.get("mrtd_auth_session")).toBe(
      "session&special=chars"
    );
  });

  it("appends query parameters to redirect URI", async () => {
    const redirectUri = "https://issuer.example/callback";
    const valPopNonce = "validation-nonce";
    const authSession = "auth-session";

    const result = await buildChallengeCallbackUrl(
      redirectUri,
      valPopNonce,
      authSession
    );

    expect(result.callbackUrl).toContain("?");
    expect(result.callbackUrl).toContain("mrtd_val_pop_nonce=validation-nonce");
    expect(result.callbackUrl).toContain("mrtd_auth_session=auth-session");
  });

  it("handles redirect URI with hash fragment", async () => {
    const redirectUri = "https://issuer.example/callback#fragment";
    const valPopNonce = "validation-nonce";
    const authSession = "auth-session";

    const result = await buildChallengeCallbackUrl(
      redirectUri,
      valPopNonce,
      authSession
    );

    expect(result.callbackUrl).toContain("#fragment");
    expect(result.callbackUrl).toContain("mrtd_val_pop_nonce=validation-nonce");
    expect(result.callbackUrl).toContain("mrtd_auth_session=auth-session");
  });

  it("returns an object with callbackUrl property", async () => {
    const redirectUri = "https://issuer.example/callback";
    const valPopNonce = "nonce";
    const authSession = "session";

    const result = await buildChallengeCallbackUrl(
      redirectUri,
      valPopNonce,
      authSession
    );

    expect(result).toHaveProperty("callbackUrl");
    expect(typeof result.callbackUrl).toBe("string");
  });
});
