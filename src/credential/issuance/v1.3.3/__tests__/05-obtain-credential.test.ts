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
      keyAttestationJwt: "mock-key-attestation",
      accessToken: {} as any,
      appFetch,
    });

    expect(fetchCredentialResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialRequest: {
          credential_identifier: "credid-123",
          proofs: {
            jwt: [
              "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImFsZyI6IkVTMjU2Iiwia2lkIjoia2V5LTEiLCJjcnYiOiJQLTI1NiIsIngiOiIxIiwieSI6IjEifSwia2V5X2F0dGVzdGF0aW9uIjoibW9jay1rZXktYXR0ZXN0YXRpb24iLCJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCJ9.eyJpYXQiOjE3NzQyMjQwMDAsImlzcyI6ImNsaWVudDEyMyIsIm5vbmNlIjoibW9jay1ub25jZSJ9.mock-signature-key-1",
              "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImFsZyI6IkVTMjU2Iiwia2lkIjoia2V5LTIiLCJjcnYiOiJQLTI1NiIsIngiOiIxIiwieSI6IjIifSwia2V5X2F0dGVzdGF0aW9uIjoibW9jay1rZXktYXR0ZXN0YXRpb24iLCJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCJ9.eyJpYXQiOjE3NzQyMjQwMDAsImlzcyI6ImNsaWVudDEyMyIsIm5vbmNlIjoibW9jay1ub25jZSJ9.mock-signature-key-2",
            ],
          },
        },
      })
    );
  });
});
