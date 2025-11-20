import { verifyAndParseChallengeInfo } from "../01-verify-and-parse-challenge-info";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  verify: jest.fn(),
  decode: jest.fn(),
}));

import {
  verify as mockVerifyJwt,
  decode as mockDecodeJwt,
} from "@pagopa/io-react-native-jwt";

describe("verifyAndParseChallengeInfo", () => {
  const clientId = "client-kid-123";
  const issuerConf: any = {
    oauth_authorization_server: {
      jwks: { keys: [{ kid: "issuer-key-1" }] },
    },
  };
  const wiaCryptoContext: any = {
    getPublicKey: jest.fn().mockResolvedValue({ kid: clientId }),
    getSignature: jest.fn(),
  };

  const buildDecoded = (payloadOverrides: Record<string, any> = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return {
      protectedHeader: {
        typ: "mrtd-ias+jwt",
        alg: "RS256",
        kid: "issuer-key-1",
      },
      payload: {
        iss: "https://issuer.example.it",
        aud: clientId,
        iat: now - 10,
        exp: now + 300,
        status: "require_interaction",
        type: "mrtd+ias",
        mrtd_auth_session: "session-abc",
        state: "state-xyz",
        mrtd_pop_jwt_nonce: "nonce-123",
        htu: "https://issuer.example.it/mrtd-pop",
        htm: "POST",
        ...payloadOverrides,
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns payload on valid JWT", async () => {
    (mockVerifyJwt as jest.Mock).mockResolvedValue(undefined);
    (mockDecodeJwt as jest.Mock).mockReturnValue(buildDecoded());
    const result = await verifyAndParseChallengeInfo(issuerConf, "jwt-value", {
      wiaCryptoContext,
    });
    expect(result.aud).toBe(clientId);
    expect(result.status).toBe("require_interaction");
  });

  test("throws if signature verification fails", async () => {
    (mockVerifyJwt as jest.Mock).mockRejectedValue(
      new Error("Invalid signature")
    );
    await expect(
      verifyAndParseChallengeInfo(issuerConf, "bad-jwt", { wiaCryptoContext })
    ).rejects.toThrow("Invalid signature");
  });

  test("throws if JWT structure is malformed", async () => {
    (mockVerifyJwt as jest.Mock).mockResolvedValue(undefined);
    (mockDecodeJwt as jest.Mock).mockReturnValue({}); // missing required fields
    await expect(
      verifyAndParseChallengeInfo(issuerConf, "malformed-jwt", {
        wiaCryptoContext,
      })
    ).rejects.toThrow("Malformed challenge info.");
  });

  test("throws if aud does not match client_id", async () => {
    (mockVerifyJwt as jest.Mock).mockResolvedValue(undefined);
    const decoded = buildDecoded({ aud: "different-client" });
    (mockDecodeJwt as jest.Mock).mockReturnValue(decoded);
    await expect(
      verifyAndParseChallengeInfo(issuerConf, "aud-mismatch", {
        wiaCryptoContext,
      })
    ).rejects.toThrow("aud claim does not match client_id.");
  });

  test("throws if issued in future", async () => {
    const fixedNowMs = 1_700_000_000_000; // arbitrary fixed timestamp ms
    jest.spyOn(Date, "now").mockReturnValue(fixedNowMs);
    const now = Math.floor(fixedNowMs / 1000);
    (mockVerifyJwt as jest.Mock).mockResolvedValue(undefined);
    const decoded = buildDecoded({ iat: now + 60 });
    (mockDecodeJwt as jest.Mock).mockReturnValue(decoded);
    await expect(
      verifyAndParseChallengeInfo(issuerConf, "future-iat", {
        wiaCryptoContext,
      })
    ).rejects.toThrow("JWT is not valid (issued in future or expired).");
  });

  test("throws if expired", async () => {
    const fixedNowMs = 1_700_000_000_000; // arbitrary fixed timestamp ms
    jest.spyOn(Date, "now").mockReturnValue(fixedNowMs);
    const now = Math.floor(fixedNowMs / 1000);
    (mockVerifyJwt as jest.Mock).mockResolvedValue(undefined);
    const decoded = buildDecoded({ exp: now - 1 });
    (mockDecodeJwt as jest.Mock).mockReturnValue(decoded);
    await expect(
      verifyAndParseChallengeInfo(issuerConf, "expired", { wiaCryptoContext })
    ).rejects.toThrow("JWT is not valid (issued in future or expired).");
  });
});
