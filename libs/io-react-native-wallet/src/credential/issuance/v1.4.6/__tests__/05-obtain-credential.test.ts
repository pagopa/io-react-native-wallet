import { fetchCredentialResponse } from "@pagopa/io-wallet-oid4vci";

import type { Signer } from "../../../../utils/crypto";
import type { IssuerConfig } from "../../api";

import { requestCredentials } from "../05-obtain-credential";

jest.mock("@pagopa/io-wallet-oid4vci", () => ({
  ...jest.requireActual("@pagopa/io-wallet-oid4vci"),
  fetchCredentialResponse: jest.fn().mockResolvedValue(Promise.resolve()),
}));

const createMockSigner = (keyTag: string, y: string): jest.Mocked<Signer> => ({
  getPublicKey: jest.fn(async () => ({
    alg: "ES256",
    crv: "P-256",
    kid: keyTag,
    kty: "EC" as const,
    use: "sig",
    x: "1",
    y,
  })),
  isRemote: false,
  sign: jest.fn(async (_) => `mock-signature-${keyTag}`),
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
      credentialIdentifier: "credid-123",
      credentialSigners: [
        createMockSigner("key-1", "1"),
        createMockSigner("key-2", "2"),
      ],
      dPopSigner: createMockSigner("key-3", "3"),
      issuerConf: mockIssuerConf,
      keyAttestationJwt: "mock-key-attestation",
    });

    expect(fetchCredentialResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialRequest: {
          credential_identifier: "credid-123",
          proofs: {
            jwt: [
              "eyJqd2siOnsiYWxnIjoiRVMyNTYiLCJjcnYiOiJQLTI1NiIsImtpZCI6ImtleS0xIiwia3R5IjoiRUMiLCJ1c2UiOiJzaWciLCJ4IjoiMSIsInkiOiIxIn0sImtleV9hdHRlc3RhdGlvbiI6Im1vY2sta2V5LWF0dGVzdGF0aW9uIiwidHlwIjoib3BlbmlkNHZjaS1wcm9vZitqd3QiLCJhbGciOiJFUzI1NiJ9.eyJhdWQiOiJodHRwczovL2lzc3Vlci1leGFtcGxlL2NyZWRlbnRpYWwiLCJpYXQiOjE3NzQyMjQwMDAsImlzcyI6ImNsaWVudDEyMyIsIm5vbmNlIjoibW9jay1ub25jZSJ9.mock-signature-key-1",
              "eyJqd2siOnsiYWxnIjoiRVMyNTYiLCJjcnYiOiJQLTI1NiIsImtpZCI6ImtleS0yIiwia3R5IjoiRUMiLCJ1c2UiOiJzaWciLCJ4IjoiMSIsInkiOiIyIn0sImtleV9hdHRlc3RhdGlvbiI6Im1vY2sta2V5LWF0dGVzdGF0aW9uIiwidHlwIjoib3BlbmlkNHZjaS1wcm9vZitqd3QiLCJhbGciOiJFUzI1NiJ9.eyJhdWQiOiJodHRwczovL2lzc3Vlci1leGFtcGxlL2NyZWRlbnRpYWwiLCJpYXQiOjE3NzQyMjQwMDAsImlzcyI6ImNsaWVudDEyMyIsIm5vbmNlIjoibW9jay1ub25jZSJ9.mock-signature-key-2",
            ],
          },
        },
      }),
    );
  });
});
