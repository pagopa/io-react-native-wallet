import { initChallenge } from "../02-init-challenge";
import { IssuerResponseError } from "../../../../utils/errors";
import type { IssuerConfig } from "../../api/IssuerConfig";

// Mock dependencies
jest.mock("../../../../utils/pop", () => ({
  createPopToken: jest.fn().mockResolvedValue("signed-wia-pop-token"),
}));

jest.mock("../../../../wallet-instance-attestation/v1.0.0/utils", () => ({
  decode: jest.fn().mockReturnValue({
    payload: { cnf: { jwk: { kid: "wia-key-id" } } },
  }),
}));

// Provide a deterministic uuid
jest.mock("uuid", () => ({ v4: () => "fixed-jti" }));

// Mock JWT decoder to return a structure compliant with MrtdPoPChallenge
const mockDecodedJwt = {
  protectedHeader: { typ: "mrtd-ias-pop+jwt", alg: "ES256", kid: "kid" },
  payload: {
    iss: "https://issuer.example",
    aud: "https://issuer.example/credential_issuer",
    iat: 1111111111,
    exp: 2222222222,
    challenge: "challenge-value",
    mrtd_pop_nonce: "nonce-value",
    htu: "https://issuer.example/mrtd/init",
    htm: "POST",
  },
};

const mockChallengeJwt =
  "eyJ0eXAiOiJtcnRkLWlhcy1wb3Arand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiJraWQifQ.eyJpc3MiOiJodHRwczovL2lzc3Vlci5leGFtcGxlIiwiYXVkIjoiaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS9jcmVkZW50aWFsX2lzc3VlciIsImlhdCI6MTExMTExMTExMSwiZXhwIjoyMjIyMjIyMjIyLCJjaGFsbGVuZ2UiOiJjaGFsbGVuZ2UtdmFsdWUiLCJtcnRkX3BvcF9ub25jZSI6Im5vbmNlLXZhbHVlIiwiaHR1IjoiaHR0cHM6Ly9pc3N1ZXIuZXhhbXBsZS9tcnRkL2luaXQiLCJodG0iOiJQT1NUIn0.8Gr0wvvmE3lF4sTUT8hj4csZe_tWpbVRqgf4-lwDStm325AtsqYRpgLLb43bKlgUrV4Z9H_mWciu7peW7UVhhg";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  verify: jest.fn(),
  getJwkFromHeader: jest.fn(),
}));

// Minimal issuer configuration used to compute aud inside the function
const issuerConf = {
  credential_issuer: mockDecodedJwt.payload.aud,
} as unknown as IssuerConfig;

// Dummy WIA crypto context (the actual object is not used because createPopToken is mocked)
const wiaCryptoContext = {} as any;

describe("initChallenge", () => {
  const mrtd_auth_session = "auth-session-id";
  const mrtd_pop_jwt_nonce = "jwt-nonce-value";
  const walletInstanceAttestation = "attestation-jwt";
  const initUrl = mockDecodedJwt.payload.htu;

  it("initializes the challenge and returns the decoded payload", async () => {
    const appFetch = jest.fn().mockResolvedValue(
      new Response(mockChallengeJwt, {
        status: 202,
        headers: { "content-type": "text/plain" },
      })
    );

    const result = await initChallenge(
      issuerConf,
      initUrl,
      mrtd_auth_session,
      mrtd_pop_jwt_nonce,
      { wiaCryptoContext, walletInstanceAttestation, appFetch }
    );

    // Returned payload matches mocked decoded JWT payload
    expect(result).toEqual({
      challenge: mockDecodedJwt.payload.challenge,
      mrtd_pop_nonce: mockDecodedJwt.payload.mrtd_pop_nonce,
      pop_verify_endpoint: mockDecodedJwt.payload.htu,
    });

    // Ensure fetch is called with correct arguments
    expect(appFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = appFetch.mock.calls[0];
    expect(calledUrl).toBe(initUrl);
    expect(options.method).toBe("POST");
    expect(options.headers["OAuth-Client-Attestation"]).toBe(
      walletInstanceAttestation
    );
    expect(options.headers["OAuth-Client-Attestation-PoP"]).toBe(
      "signed-wia-pop-token"
    );
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({
      mrtd_auth_session,
      mrtd_pop_jwt_nonce,
    });

    // Validate createPopToken was invoked with expected claims
    const { createPopToken } = require("../../../../utils/pop");
    expect(createPopToken).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: "fixed-jti",
        aud: mockDecodedJwt.payload.aud,
        iss: "wia-key-id",
      }),
      wiaCryptoContext
    );
  });

  it("throws IssuerResponseError when status code is not 202", async () => {
    const appFetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "bad_request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );

    try {
      await initChallenge(
        issuerConf,
        initUrl,
        mrtd_auth_session,
        mrtd_pop_jwt_nonce,
        { wiaCryptoContext, walletInstanceAttestation, appFetch }
      );
      fail("Should have thrown IssuerResponseError");
    } catch (err) {
      expect(err).toBeInstanceOf(IssuerResponseError);
      const e = err as IssuerResponseError;
      expect(e.statusCode).toBe(400);
    }
  });

  it("uses provided appFetch implementation", async () => {
    const customFetch = jest
      .fn()
      .mockResolvedValue(new Response(mockChallengeJwt, { status: 202 }));

    await initChallenge(
      issuerConf,
      initUrl,
      mrtd_auth_session,
      mrtd_pop_jwt_nonce,
      { wiaCryptoContext, walletInstanceAttestation, appFetch: customFetch }
    );

    expect(customFetch).toHaveBeenCalled();
  });
});
