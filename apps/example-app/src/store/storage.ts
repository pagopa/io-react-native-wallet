import * as SecureStorage from "@pagopa/io-react-native-secure-storage";
import { type Storage } from "redux-persist";

export const createSecureStorage = (): Storage => ({
  getItem: async (key) => {
    try {
      return await SecureStorage.get(key);
    } catch {
      return undefined;
    }
  },

  removeItem: (key) => SecureStorage.remove(key),

  setItem: (key, value) => SecureStorage.put(key, value),
});
