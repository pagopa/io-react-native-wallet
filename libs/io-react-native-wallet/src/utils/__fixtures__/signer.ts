import type { Signer } from "../crypto";

const mockPublicKey = {
  alg: "RS256",
  e: "AQAB",
  kid: "mock-kid",
  kty: "RSA" as const,
  n: "utqtxbs-jnK0cPsV7aRkkZKA9t4S-WSZa3nCZtYIKDpgLnR_qcpeF0diJZvKOqXmj2cXaKFUE-8uHKAHo7BL7T-Rj2x3vGESh7SG1pE0thDGlXj4yNsg0qNvCXtk703L2H3i1UXwx6nq1uFxD2EcOE4a6qDYBI16Zl71TUZktJwmOejoHl16CPWqDLGo9GUSk_MmHOV20m4wXWkB4qbvpWVY8H6b2a0rB1B1YPOs5ZLYarSYZgjDEg6DMtZ4NgiwZ-4N1aaLwyO-GLwt9Vf-NBKwoxeRyD3zWE2FXRFBbhKGksMrCGnFDsNl5JTlPjaM3kYyImE941ggcuc495m-Fw",
};

/**
 * Create an in-memory {@link Signer} that returns a fixed public key and a stub signature.
 * It does not rely on any native module.
 */
export const createMockSigner = (kind: Signer["kind"] = "LOCAL"): Signer => ({
  getPublicKey: jest.fn(async () => mockPublicKey),
  kind,
  sign: jest.fn(async () => "mock-signature"),
});
