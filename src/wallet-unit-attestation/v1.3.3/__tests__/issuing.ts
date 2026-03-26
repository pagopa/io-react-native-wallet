import { Platform } from "react-native";
import { getAttestation } from "../issuing";
import type { IntegrityContext } from "../../../utils/integrity";
import type { KeyAttestationCryptoContext } from "../../../utils/crypto";
import { IoWalletError } from "../../../utils/errors";

const integrityContextMock: jest.Mocked<IntegrityContext> = {
  getHardwareKeyTag: jest.fn(),
  getAttestation: jest.fn(),
  getHardwareSignatureWithAuthData: jest.fn(async (_) => ({
    signature: "mock-sig-123",
    authenticatorData: "mock-auth-data-123",
  })),
};

const createMockKeyAttestationCryptoContext = (
  keyTag: string
): jest.Mocked<KeyAttestationCryptoContext> => ({
  getPublicKey: jest.fn(async () => ({
    kty: "EC",
    use: "sig",
    alg: "ES256",
    kid: keyTag,
    crv: "P-256",
    x: "1",
    y: "2",
  })),
  getSignature: jest.fn(async (_) => `mock-signature-${keyTag}`),
  generateKeyWithAttestation: jest.fn(async (_) => ({
    success: true,
    attestation: `mock-key-attestation-${keyTag}`,
  })),
});

const createMockFetch = () => {
  const appFetch = jest.fn();

  appFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ nonce: "mock-nonce" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );

  appFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ wallet_unit_attestation: "wua" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );

  return appFetch;
};

describe("WalletUnitAttestation | getAttestation", () => {
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
        integrityContext: integrityContextMock,
        keysToAttest: [
          createMockKeyAttestationCryptoContext("key-1"),
          createMockKeyAttestationCryptoContext("key-2"),
          createMockKeyAttestationCryptoContext("key-3"),
        ],
        appFetch,
      }
    );

    expect(appFetch.mock.lastCall[1].body).toEqual(
      "eyJraWQiOiJrZXktMSIsInR5cCI6Ind1YS1yZXF1ZXN0K2p3dCIsImFsZyI6IkVTMjU2In0.eyJub25jZSI6Im1vY2stbm9uY2UiLCJrZXlzX3RvX2F0dGVzdCI6WyJleUpyYVdRaU9pSnJaWGt0TVNJc0luUjVjQ0k2SW10bGVTMWhkSFJsYzNSaGRHbHZiaTF5WlhGMVpYTjBLMnAzZENJc0ltRnNaeUk2SWtWVE1qVTJJbjAuZXlKM2MyTmtYMnRsZVY5aGRIUmxjM1JoZEdsdmJpSTZleUp6ZEc5eVlXZGxYM1I1Y0dVaU9pSk1UME5CVEY5T1FWUkpWa1VpTENKaGRIUmxjM1JoZEdsdmJpSTZJbTF2WTJzdGEyVjVMV0YwZEdWemRHRjBhVzl1TFd0bGVTMHhJbjBzSW1OdVppSTZleUpxZDJzaU9uc2lZV3huSWpvaVJWTXlOVFlpTENKamNuWWlPaUpRTFRJMU5pSXNJbXRwWkNJNkltdGxlUzB4SWl3aWEzUjVJam9pUlVNaUxDSjFjMlVpT2lKemFXY2lMQ0o0SWpvaU1TSXNJbmtpT2lJeUluMTlMQ0pwWVhRaU9qRTNOek0yTVRreU1EQXNJbVY0Y0NJNk1UYzNNell5TWpnd01IMC5tb2NrLXNpZ25hdHVyZS1rZXktMSIsImV5SnJhV1FpT2lKclpYa3RNaUlzSW5SNWNDSTZJbXRsZVMxaGRIUmxjM1JoZEdsdmJpMXlaWEYxWlhOMEsycDNkQ0lzSW1Gc1p5STZJa1ZUTWpVMkluMC5leUozYzJOa1gydGxlVjloZEhSbGMzUmhkR2x2YmlJNmV5SnpkRzl5WVdkbFgzUjVjR1VpT2lKTVQwTkJURjlPUVZSSlZrVWlMQ0poZEhSbGMzUmhkR2x2YmlJNkltMXZZMnN0YTJWNUxXRjBkR1Z6ZEdGMGFXOXVMV3RsZVMweUluMHNJbU51WmlJNmV5SnFkMnNpT25zaVlXeG5Jam9pUlZNeU5UWWlMQ0pqY25ZaU9pSlFMVEkxTmlJc0ltdHBaQ0k2SW10bGVTMHlJaXdpYTNSNUlqb2lSVU1pTENKMWMyVWlPaUp6YVdjaUxDSjRJam9pTVNJc0lua2lPaUl5SW4xOUxDSnBZWFFpT2pFM056TTJNVGt5TURBc0ltVjRjQ0k2TVRjM016WXlNamd3TUgwLm1vY2stc2lnbmF0dXJlLWtleS0yIiwiZXlKcmFXUWlPaUpyWlhrdE15SXNJblI1Y0NJNkltdGxlUzFoZEhSbGMzUmhkR2x2YmkxeVpYRjFaWE4wSzJwM2RDSXNJbUZzWnlJNklrVlRNalUySW4wLmV5SjNjMk5rWDJ0bGVWOWhkSFJsYzNSaGRHbHZiaUk2ZXlKemRHOXlZV2RsWDNSNWNHVWlPaUpNVDBOQlRGOU9RVlJKVmtVaUxDSmhkSFJsYzNSaGRHbHZiaUk2SW0xdlkyc3RhMlY1TFdGMGRHVnpkR0YwYVc5dUxXdGxlUzB6SW4wc0ltTnVaaUk2ZXlKcWQyc2lPbnNpWVd4bklqb2lSVk15TlRZaUxDSmpjbllpT2lKUUxUSTFOaUlzSW10cFpDSTZJbXRsZVMweklpd2lhM1I1SWpvaVJVTWlMQ0oxYzJVaU9pSnphV2NpTENKNElqb2lNU0lzSW5raU9pSXlJbjE5TENKcFlYUWlPakUzTnpNMk1Ua3lNREFzSW1WNGNDSTZNVGMzTXpZeU1qZ3dNSDAubW9jay1zaWduYXR1cmUta2V5LTMiXSwiaGFyZHdhcmVfc2lnbmF0dXJlIjoibW9jay1zaWctMTIzIiwiaW50ZWdyaXR5X2Fzc2VydGlvbiI6Im1vY2stYXV0aC1kYXRhLTEyMyIsInBsYXRmb3JtIjoiaW9zIiwid2FsbGV0X3NvbHV0aW9uX2lkIjoid2FsbGV0U29sIiwid2FsbGV0X3NvbHV0aW9uX3ZlcnNpb24iOiIxLjAuMCIsImNuZiI6eyJqd2siOnsiYWxnIjoiRVMyNTYiLCJjcnYiOiJQLTI1NiIsImtpZCI6ImtleS0xIiwia3R5IjoiRUMiLCJ1c2UiOiJzaWciLCJ4IjoiMSIsInkiOiIyIn19LCJpYXQiOjE3NzM2MTkyMDAsImV4cCI6MTc3MzYyMjgwMH0.mock-signature-key-1"
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
        integrityContext: integrityContextMock,
        keysToAttest: [keyToAttest],
        appFetch,
      }
    );

    expect(appFetch.mock.lastCall[1].body).toEqual(
      "eyJraWQiOiJrZXktMSIsInR5cCI6Ind1YS1yZXF1ZXN0K2p3dCIsImFsZyI6IkVTMjU2In0.eyJub25jZSI6Im1vY2stbm9uY2UiLCJrZXlzX3RvX2F0dGVzdCI6WyJleUpyYVdRaU9pSnJaWGt0TVNJc0luUjVjQ0k2SW10bGVTMWhkSFJsYzNSaGRHbHZiaTF5WlhGMVpYTjBLMnAzZENJc0ltRnNaeUk2SWtWVE1qVTJJbjAuZXlKM2MyTmtYMnRsZVY5aGRIUmxjM1JoZEdsdmJpSTZleUp6ZEc5eVlXZGxYM1I1Y0dVaU9pSk1UME5CVEY5T1FWUkpWa1VpZlN3aVkyNW1JanA3SW1wM2F5STZleUpoYkdjaU9pSkZVekkxTmlJc0ltTnlkaUk2SWxBdE1qVTJJaXdpYTJsa0lqb2lhMlY1TFRFaUxDSnJkSGtpT2lKRlF5SXNJblZ6WlNJNkluTnBaeUlzSW5naU9pSXhJaXdpZVNJNklqSWlmWDBzSW1saGRDSTZNVGMzTXpZeE9USXdNQ3dpWlhod0lqb3hOemN6TmpJeU9EQXdmUS5tb2NrLXNpZ25hdHVyZS1rZXktMSJdLCJoYXJkd2FyZV9zaWduYXR1cmUiOiJtb2NrLXNpZy0xMjMiLCJpbnRlZ3JpdHlfYXNzZXJ0aW9uIjoibW9jay1hdXRoLWRhdGEtMTIzIiwicGxhdGZvcm0iOiJpb3MiLCJ3YWxsZXRfc29sdXRpb25faWQiOiJ3YWxsZXRTb2wiLCJ3YWxsZXRfc29sdXRpb25fdmVyc2lvbiI6IjEuMC4wIiwiY25mIjp7Imp3ayI6eyJhbGciOiJFUzI1NiIsImNydiI6IlAtMjU2Iiwia2lkIjoia2V5LTEiLCJrdHkiOiJFQyIsInVzZSI6InNpZyIsIngiOiIxIiwieSI6IjIifX0sImlhdCI6MTc3MzYxOTIwMCwiZXhwIjoxNzczNjIyODAwfQ.mock-signature-key-1"
    );
  });

  it("should throw on Android when the key is generated without a key attestation", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    const appFetch = createMockFetch();

    const keyToAttest = createMockKeyAttestationCryptoContext("key-1");
    keyToAttest.generateKeyWithAttestation.mockResolvedValueOnce({
      success: true,
      attestation: undefined, // Test the missing key attestation
    });

    await expect(() =>
      getAttestation(
        {
          walletProviderBaseUrl: "https://example.wp",
          walletSolutionId: "walletSol",
          walletSolutionVersion: "1.0.0",
        },
        {
          integrityContext: integrityContextMock,
          keysToAttest: [keyToAttest],
          appFetch,
        }
      )
    ).rejects.toThrow(IoWalletError);
  });
});
