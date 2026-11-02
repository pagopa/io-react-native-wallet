import type { IntegrityContext } from "../../../utils/integrity";

import {
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../../../utils/errors";
import { getAttestation } from "../issuing";

const integrityContextMock: jest.Mocked<IntegrityContext> = {
  getAttestation: jest.fn(),
  getHardwareKeyTag: jest.fn(),
  getHardwareSignatureWithAuthData: jest.fn(async (_) => ({
    authenticatorData: "mock-auth-data-123",
    signature: "mock-sig-123",
  })),
};

const wiaCryptoContext = {
  getPublicKey: jest.fn(async () => ({
    crv: "P-256",
    kid: "key-1",
    kty: "EC",
    x: "1",
    y: "2",
  })),
  getSignature: jest.fn(async (_: string) => "mock-signature"),
};

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

describe("WalletInstanceAttestation v1.4.6 | getAttestation", () => {
  it("should throw WalletInstanceIntegrityFailed when the endpoint returns 409", async () => {
    const appFetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ nonce: "mock-nonce" }, 200))
      .mockResolvedValueOnce(jsonResponse({}, 409));

    const error = await getAttestation(
      {
        walletProviderBaseUrl: "https://example.wp",
        walletSolutionId: "walletSol",
        walletSolutionVersion: "1.0.0",
      },
      { appFetch, integrityContext: integrityContextMock, wiaCryptoContext },
    ).catch((e) => e);

    expect(error).toBeInstanceOf(WalletProviderResponseError);
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe(
      WalletProviderResponseErrorCodes.WalletInstanceIntegrityFailed,
    );
  });
});
