import { Platform } from "react-native";

import type { KeyAttestationCryptoContext } from "../../../utils/crypto";
import type { IntegrityContext } from "../../../utils/integrity";

import { IoWalletError } from "../../../utils/errors";
import { getAttestation } from "../issuing";

const integrityContextMock: jest.Mocked<IntegrityContext> = {
  getAttestation: jest.fn(),
  getHardwareKeyTag: jest.fn(),
  getHardwareSignatureWithAuthData: jest.fn(async (_) => ({
    authenticatorData: "mock-auth-data-123",
    signature: "mock-sig-123",
  })),
};

const createMockKeyAttestationCryptoContext = (
  keyTag: string,
): jest.Mocked<KeyAttestationCryptoContext> => ({
  generateKeyWithAttestation: jest.fn(async (_) => ({
    attestation: `mock-key-attestation-${keyTag}`,
    success: true,
  })),
  getPublicKey: jest.fn(async () => ({
    alg: "ES256",
    crv: "P-256",
    kid: keyTag,
    kty: "EC",
    use: "sig",
    x: "1",
    y: "2",
  })),
  getSignature: jest.fn(async (_) => `mock-signature-${keyTag}`),
});

const createMockFetch = () => {
  const appFetch = jest.fn();

  appFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ nonce: "mock-nonce" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  );

  appFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ key_attestation: "wua" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }),
  );

  return appFetch;
};

describe("KeyAttestation | getAttestation", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should call the WUA endpoint with the correct WUA JWT request (with key attestation)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-16T00:00:00Z"));

    const appFetch = createMockFetch();

    await getAttestation(
      {
        walletProviderBaseUrl: "https://example.wp",
        walletSolutionId: "walletSol",
        walletSolutionVersion: "1.0.0",
      },
      {
        appFetch,
        integrityContext: integrityContextMock,
        keysToAttest: [
          createMockKeyAttestationCryptoContext("key-1"),
          createMockKeyAttestationCryptoContext("key-2"),
          createMockKeyAttestationCryptoContext("key-3"),
        ],
      },
    );

    expect(appFetch.mock.lastCall[1].body).toEqual(
      "eyJraWQiOiJrZXktMSIsInR5cCI6Ind1YS1yZXF1ZXN0K2p3dCIsImFsZyI6IkVTMjU2In0.eyJjbmYiOnsiandrIjp7ImFsZyI6IkVTMjU2IiwiY3J2IjoiUC0yNTYiLCJraWQiOiJrZXktMSIsImt0eSI6IkVDIiwidXNlIjoic2lnIiwieCI6IjEiLCJ5IjoiMiJ9fSwiaGFyZHdhcmVfc2lnbmF0dXJlIjoibW9jay1zaWctMTIzIiwiaW50ZWdyaXR5X2Fzc2VydGlvbiI6Im1vY2stYXV0aC1kYXRhLTEyMyIsImtleXNfdG9fYXR0ZXN0IjpbImV5SnJhV1FpT2lKclpYa3RNU0lzSW5SNWNDSTZJbXRsZVMxaGRIUmxjM1JoZEdsdmJpMXlaWEYxWlhOMEsycDNkQ0lzSW1Gc1p5STZJa1ZUTWpVMkluMC5leUpqYm1ZaU9uc2lhbmRySWpwN0ltRnNaeUk2SWtWVE1qVTJJaXdpWTNKMklqb2lVQzB5TlRZaUxDSnJhV1FpT2lKclpYa3RNU0lzSW10MGVTSTZJa1ZESWl3aWRYTmxJam9pYzJsbklpd2llQ0k2SWpFaUxDSjVJam9pTWlKOWZTd2lkM05qWkY5clpYbGZZWFIwWlhOMFlYUnBiMjRpT25zaWMzUnZjbUZuWlY5MGVYQmxJam9pVEU5RFFVeGZUa0ZVU1ZaRklpd2lZWFIwWlhOMFlYUnBiMjRpT2lKdGIyTnJMV3RsZVMxaGRIUmxjM1JoZEdsdmJpMXJaWGt0TVNKOUxDSnBZWFFpT2pFM056TTJNVGt5TURBc0ltVjRjQ0k2TVRjM016WXlNamd3TUgwLm1vY2stc2lnbmF0dXJlLWtleS0xIiwiZXlKcmFXUWlPaUpyWlhrdE1pSXNJblI1Y0NJNkltdGxlUzFoZEhSbGMzUmhkR2x2YmkxeVpYRjFaWE4wSzJwM2RDSXNJbUZzWnlJNklrVlRNalUySW4wLmV5SmpibVlpT25zaWFuZHJJanA3SW1Gc1p5STZJa1ZUTWpVMklpd2lZM0oySWpvaVVDMHlOVFlpTENKcmFXUWlPaUpyWlhrdE1pSXNJbXQwZVNJNklrVkRJaXdpZFhObElqb2ljMmxuSWl3aWVDSTZJakVpTENKNUlqb2lNaUo5ZlN3aWQzTmpaRjlyWlhsZllYUjBaWE4wWVhScGIyNGlPbnNpYzNSdmNtRm5aVjkwZVhCbElqb2lURTlEUVV4ZlRrRlVTVlpGSWl3aVlYUjBaWE4wWVhScGIyNGlPaUp0YjJOckxXdGxlUzFoZEhSbGMzUmhkR2x2YmkxclpYa3RNaUo5TENKcFlYUWlPakUzTnpNMk1Ua3lNREFzSW1WNGNDSTZNVGMzTXpZeU1qZ3dNSDAubW9jay1zaWduYXR1cmUta2V5LTIiLCJleUpyYVdRaU9pSnJaWGt0TXlJc0luUjVjQ0k2SW10bGVTMWhkSFJsYzNSaGRHbHZiaTF5WlhGMVpYTjBLMnAzZENJc0ltRnNaeUk2SWtWVE1qVTJJbjAuZXlKamJtWWlPbnNpYW5kcklqcDdJbUZzWnlJNklrVlRNalUySWl3aVkzSjJJam9pVUMweU5UWWlMQ0pyYVdRaU9pSnJaWGt0TXlJc0ltdDBlU0k2SWtWRElpd2lkWE5sSWpvaWMybG5JaXdpZUNJNklqRWlMQ0o1SWpvaU1pSjlmU3dpZDNOalpGOXJaWGxmWVhSMFpYTjBZWFJwYjI0aU9uc2ljM1J2Y21GblpWOTBlWEJsSWpvaVRFOURRVXhmVGtGVVNWWkZJaXdpWVhSMFpYTjBZWFJwYjI0aU9pSnRiMk5yTFd0bGVTMWhkSFJsYzNSaGRHbHZiaTFyWlhrdE15SjlMQ0pwWVhRaU9qRTNOek0yTVRreU1EQXNJbVY0Y0NJNk1UYzNNell5TWpnd01IMC5tb2NrLXNpZ25hdHVyZS1rZXktMyJdLCJub25jZSI6Im1vY2stbm9uY2UiLCJwbGF0Zm9ybSI6ImlvcyIsIndhbGxldF9zb2x1dGlvbl9pZCI6IndhbGxldFNvbCIsIndhbGxldF9zb2x1dGlvbl92ZXJzaW9uIjoiMS4wLjAiLCJpYXQiOjE3NzM2MTkyMDAsImV4cCI6MTc3MzYyMjgwMH0.mock-signature-key-1",
    );
  });

  it("should call the WUA endpoint with the correct WUA JWT request (no key attestation)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-16T00:00:00Z"));

    const appFetch = createMockFetch();

    const keyToAttest = createMockKeyAttestationCryptoContext("key-1");
    keyToAttest.generateKeyWithAttestation.mockResolvedValueOnce({
      success: true,
    });

    await getAttestation(
      {
        walletProviderBaseUrl: "https://example.wp",
        walletSolutionId: "walletSol",
        walletSolutionVersion: "1.0.0",
      },
      {
        appFetch,
        integrityContext: integrityContextMock,
        keysToAttest: [keyToAttest],
      },
    );

    expect(appFetch.mock.lastCall[1].body).toEqual(
      "eyJraWQiOiJrZXktMSIsInR5cCI6Ind1YS1yZXF1ZXN0K2p3dCIsImFsZyI6IkVTMjU2In0.eyJjbmYiOnsiandrIjp7ImFsZyI6IkVTMjU2IiwiY3J2IjoiUC0yNTYiLCJraWQiOiJrZXktMSIsImt0eSI6IkVDIiwidXNlIjoic2lnIiwieCI6IjEiLCJ5IjoiMiJ9fSwiaGFyZHdhcmVfc2lnbmF0dXJlIjoibW9jay1zaWctMTIzIiwiaW50ZWdyaXR5X2Fzc2VydGlvbiI6Im1vY2stYXV0aC1kYXRhLTEyMyIsImtleXNfdG9fYXR0ZXN0IjpbImV5SnJhV1FpT2lKclpYa3RNU0lzSW5SNWNDSTZJbXRsZVMxaGRIUmxjM1JoZEdsdmJpMXlaWEYxWlhOMEsycDNkQ0lzSW1Gc1p5STZJa1ZUTWpVMkluMC5leUpqYm1ZaU9uc2lhbmRySWpwN0ltRnNaeUk2SWtWVE1qVTJJaXdpWTNKMklqb2lVQzB5TlRZaUxDSnJhV1FpT2lKclpYa3RNU0lzSW10MGVTSTZJa1ZESWl3aWRYTmxJam9pYzJsbklpd2llQ0k2SWpFaUxDSjVJam9pTWlKOWZTd2lkM05qWkY5clpYbGZZWFIwWlhOMFlYUnBiMjRpT25zaWMzUnZjbUZuWlY5MGVYQmxJam9pVEU5RFFVeGZUa0ZVU1ZaRkluMHNJbWxoZENJNk1UYzNNell4T1RJd01Dd2laWGh3SWpveE56Y3pOakl5T0RBd2ZRLm1vY2stc2lnbmF0dXJlLWtleS0xIl0sIm5vbmNlIjoibW9jay1ub25jZSIsInBsYXRmb3JtIjoiaW9zIiwid2FsbGV0X3NvbHV0aW9uX2lkIjoid2FsbGV0U29sIiwid2FsbGV0X3NvbHV0aW9uX3ZlcnNpb24iOiIxLjAuMCIsImlhdCI6MTc3MzYxOTIwMCwiZXhwIjoxNzczNjIyODAwfQ.mock-signature-key-1",
    );
  });

  it("should throw on Android when the key is generated without a key attestation", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    const keyToAttest = createMockKeyAttestationCryptoContext("key-1");
    keyToAttest.generateKeyWithAttestation.mockResolvedValueOnce({
      attestation: undefined, // Test the missing key attestation
      success: true,
    });

    await expect(() =>
      getAttestation(
        {
          walletProviderBaseUrl: "https://example.wp",
          walletSolutionId: "walletSol",
          walletSolutionVersion: "1.0.0",
        },
        {
          appFetch: createMockFetch(),
          integrityContext: integrityContextMock,
          keysToAttest: [keyToAttest],
        },
      ),
    ).rejects.toThrow(IoWalletError);
  });

  it("should throw when generateKeyWithAttestation returns { success: false }", async () => {
    const keyToAttest = createMockKeyAttestationCryptoContext("key-1");
    keyToAttest.generateKeyWithAttestation.mockResolvedValueOnce({
      success: false,
    });

    await expect(() =>
      getAttestation(
        {
          walletProviderBaseUrl: "https://example.wp",
          walletSolutionId: "walletSol",
          walletSolutionVersion: "1.0.0",
        },
        {
          appFetch: createMockFetch(),
          integrityContext: integrityContextMock,
          keysToAttest: [keyToAttest],
        },
      ),
    ).rejects.toThrow(IoWalletError);
  });
});
