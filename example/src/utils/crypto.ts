import {
  generate,
  deleteKey,
  type CryptoError,
} from "@pagopa/io-react-native-crypto";

export const regenerateCryptoKey = async (keyTag: string) => {
  // Delete the key if it exists, otherwise ignore the error
  await deleteIfExists(keyTag);
  await generate(keyTag);
};

export const deleteIfExists = async (keyTag: string) => {
  await deleteKey(keyTag).catch((e) => {
    const { message } = e as CryptoError;
    if (message !== "PUBLIC_KEY_NOT_FOUND") throw e;
  });
};
