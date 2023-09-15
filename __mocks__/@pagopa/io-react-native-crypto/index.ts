import * as source from "@pagopa/io-react-native-crypto";

// simlates the keystore
const keystore: Map<string, source.PublicKey> = new Map<
  string,
  source.PublicKey
>();

// Used for mock-specific errors
class MockCryptoError extends Error {
  name: string = "MockCryptoError";
}

const mockKey = {} as unknown as source.PublicKey;

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

export { deleteKey, getPublicKey, generate, sign };
