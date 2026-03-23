import { fetchCredentialResponse } from "@pagopa/io-wallet-oid4vci";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { requestCredentials } from "../05-obtain-credential";
import type { IssuerConfig } from "../../api";

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  ...jest.requireActual("@pagopa/io-wallet-oid4vci"),
  fetchCredentialResponse: jest.fn().mockResolvedValue(Promise.resolve()),
}));

const createMockCryptoContext = (
  keyTag: string,
  y: string
): jest.Mocked<CryptoContext> => ({
  getPublicKey: jest.fn(async () => ({
    kty: "EC",
    use: "sig",
    alg: "ES256",
    kid: keyTag,
    crv: "P-256",
    x: "1",
    y,
  })),
  getSignature: jest.fn(async (_) => `mock-signature-${keyTag}`),
});

describe("requestCredentials", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const mockIssuerConf = {
    nonce_endpoint: "https://issuer-example/nonce",
    credential_endpoint: "https://issuer-example/credential",
  } as IssuerConfig;

  it("calls fetchCredentialResponse with the correct credential request", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-23T00:00:00Z"));

    const appFetch = jest.fn();

    appFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ c_nonce: "mock-nonce" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await requestCredentials({
      issuerConf: mockIssuerConf,
      clientId: "client123",
      credentialIdentifier: "credid-123",
      credentialCryptoContexts: [
        createMockCryptoContext("key-1", "1"),
        createMockCryptoContext("key-2", "2"),
      ],
      dPopCryptoContext: createMockCryptoContext("key-3", "3"),
      accessToken: {} as any,
      appFetch,
    });

    expect(fetchCredentialResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialRequest: {
          credential_identifier: "credid-123",
          proofs: {
            jwt: [
              "eyJhbGciOiJFUzI1NiJ9.eyJoZWFkZXIiOnsiYWxnIjoiRVMyNTYiLCJqd2siOnsia3R5IjoiRUMiLCJ1c2UiOiJzaWciLCJhbGciOiJFUzI1NiIsImtpZCI6ImtleS0xIiwiY3J2IjoiUC0yNTYiLCJ4IjoiMSIsInkiOiIxIn0sImtleV9hdHRlc3RhdGlvbiI6IiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0In0sInBheWxvYWQiOnsiaWF0IjoxNzc0MjI0MDAwLCJpc3MiOiJjbGllbnQxMjMiLCJub25jZSI6Im1vY2stbm9uY2UifX0.mock-signature-key-1",
              "eyJhbGciOiJFUzI1NiJ9.eyJoZWFkZXIiOnsiYWxnIjoiRVMyNTYiLCJqd2siOnsia3R5IjoiRUMiLCJ1c2UiOiJzaWciLCJhbGciOiJFUzI1NiIsImtpZCI6ImtleS0yIiwiY3J2IjoiUC0yNTYiLCJ4IjoiMSIsInkiOiIyIn0sImtleV9hdHRlc3RhdGlvbiI6IiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0In0sInBheWxvYWQiOnsiaWF0IjoxNzc0MjI0MDAwLCJpc3MiOiJjbGllbnQxMjMiLCJub25jZSI6Im1vY2stbm9uY2UifX0.mock-signature-key-2",
            ],
          },
        },
      })
    );
  });
});
