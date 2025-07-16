import * as source from "@pagopa/io-react-native-crypto";

// mock keystore
const keystore: Map<string, source.PublicKey> = new Map<
  string,
  source.PublicKey
>();

// Used for mock-specific errors
class MockCryptoError extends Error {
  name: string = "MockCryptoError";
}

const mockKey: source.PublicKey = {
  kty: "RSA",
  alg: "RS256",
  e: "AQAB",
  n: "utqtxbs-jnK0cPsV7aRkkZKA9t4S-WSZa3nCZtYIKDpgLnR_qcpeF0diJZvKOqXmj2cXaKFUE-8uHKAHo7BL7T-Rj2x3vGESh7SG1pE0thDGlXj4yNsg0qNvCXtk703L2H3i1UXwx6nq1uFxD2EcOE4a6qDYBI16Zl71TUZktJwmOejoHl16CPWqDLGo9GUSk_MmHOV20m4wXWkB4qbvpWVY8H6b2a0rB1B1YPOs5ZLYarSYZgjDEg6DMtZ4NgiwZ-4N1aaLwyO-GLwt9Vf-NBKwoxeRyD3zWE2FXRFBbhKGksMrCGnFDsNl5JTlPjaM3kYyImE941ggcuc495m-Fw",
};

const deleteKey = jest.fn<
  ReturnType<typeof source.deleteKey>,
  Parameters<typeof source.deleteKey>
>(async (keytag) => {
  keystore.delete(keytag);
});

const getPublicKey = jest.fn<
  ReturnType<typeof source.getPublicKey>,
  Parameters<typeof source.getPublicKey>
>(async (keytag) => {
  if (keystore.has(keytag)) return mockKey;
  throw new MockCryptoError(
    `MockCryptoError: cannot retrieve key, keytag '${keytag}' does not exist`
  );
});

const getPublicKeyFixed = jest.fn<
  ReturnType<typeof source.getPublicKeyFixed>,
  Parameters<typeof source.getPublicKeyFixed>
>(async (keytag) => {
  if (keystore.has(keytag)) return mockKey;
  throw new MockCryptoError(
    `MockCryptoError: cannot retrieve key, keytag '${keytag}' does not exist`
  );
});

const generate = jest.fn<
  ReturnType<typeof source.generate>,
  Parameters<typeof source.generate>
>(async (keytag) => {
  if (keystore.has(keytag)) {
    throw new MockCryptoError(
      `MockCryptoError: keytag '${keytag}' already exists`
    );
  }
  keystore.set(keytag, mockKey);
  return mockKey;
});

const sign = jest.fn<
  ReturnType<typeof source.sign>,
  Parameters<typeof source.sign>
>(async (_, keytag) => {
  if (keystore.has(keytag)) return "mock-signature";
  throw new MockCryptoError(
    `MockCryptoError: cannot sign, keytag '${keytag}' does not exist`
  );
});

const verifyCertificateChain = jest.fn().mockResolvedValue({
  isValid: true,
  validationStatus: "VALID",
  errorMessage: undefined,
});

export { deleteKey, getPublicKey, getPublicKeyFixed, generate, sign, verifyCertificateChain };
