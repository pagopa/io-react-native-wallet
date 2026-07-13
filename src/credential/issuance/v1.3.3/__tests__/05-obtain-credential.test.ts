import type { CryptoContext } from "@pagopa/io-react-native-jwt";

import { fetchCredentialResponse } from "@pagopa/io-wallet-oid4vci";

import type { IssuerConfig } from "../../api";

import { requestCredentials } from "../05-obtain-credential";

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  ...jest.requireActual("@pagopa/io-wallet-oid4vci"),
  fetchCredentialResponse: jest.fn().mockResolvedValue(Promise.resolve()),
}));

const createMockCryptoContext = (
  keyTag: string,
  y: string,
): jest.Mocked<CryptoContext> => ({
  getPublicKey: jest.fn(async () => ({
    alg: "ES256",
    crv: "P-256",
    kid: keyTag,
    kty: "EC",
    use: "sig",
    x: "1",
    y,
  })),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- mock arg intentionally unused
  getSignature: jest.fn(async (_) => `mock-signature-${keyTag}`),
});

describe("requestCredentials", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const mockIssuerConf = {
    credential_endpoint: "https://issuer-example/credential",
    nonce_endpoint: "https://issuer-example/nonce",
  } as IssuerConfig;

  it("calls fetchCredentialResponse with the correct credential request", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-23T00:00:00Z"));

    const appFetch = jest.fn();

    appFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ c_nonce: "mock-nonce" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await requestCredentials({
      accessToken: {} as unknown as Parameters<
        typeof requestCredentials
      >[0]["accessToken"],
      appFetch,
      clientId: "client123",
      credentialCryptoContexts: [
        createMockCryptoContext("key-1", "1"),
        createMockCryptoContext("key-2", "2"),
      ],
      credentialIdentifier: "credid-123",
      dPopCryptoContext: createMockCryptoContext("key-3", "3"),
      issuerConf: mockIssuerConf,
      keyAttestationJwt: "mock-key-attestation",
    });

    expect(fetchCredentialResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialRequest: {
          credential_identifier: "credid-123",
          proofs: {
            jwt: [
              "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImFsZyI6IkVTMjU2Iiwia2lkIjoia2V5LTEiLCJjcnYiOiJQLTI1NiIsIngiOiIxIiwieSI6IjEifSwia2V5X2F0dGVzdGF0aW9uIjoibW9jay1rZXktYXR0ZXN0YXRpb24iLCJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCJ9.eyJhdWQiOiJodHRwczovL2lzc3Vlci1leGFtcGxlL2NyZWRlbnRpYWwiLCJpYXQiOjE3NzQyMjQwMDAsImlzcyI6ImNsaWVudDEyMyIsIm5vbmNlIjoibW9jay1ub25jZSJ9.mock-signature-key-1",
              "eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsInVzZSI6InNpZyIsImFsZyI6IkVTMjU2Iiwia2lkIjoia2V5LTIiLCJjcnYiOiJQLTI1NiIsIngiOiIxIiwieSI6IjIifSwia2V5X2F0dGVzdGF0aW9uIjoibW9jay1rZXktYXR0ZXN0YXRpb24iLCJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCJ9.eyJhdWQiOiJodHRwczovL2lzc3Vlci1leGFtcGxlL2NyZWRlbnRpYWwiLCJpYXQiOjE3NzQyMjQwMDAsImlzcyI6ImNsaWVudDEyMyIsIm5vbmNlIjoibW9jay1ub25jZSJ9.mock-signature-key-2",
            ],
          },
        },
      }),
    );
  });
});
