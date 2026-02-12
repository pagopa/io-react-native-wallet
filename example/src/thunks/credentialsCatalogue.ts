import {
  IoWallet,
  type CredentialsCatalogue,
} from "@pagopa/io-react-native-wallet";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { getEnv } from "../utils/environment";
import { createAppAsyncThunk } from "./utils";

export const getCredentialsCatalogueThunk = createAppAsyncThunk<
  CredentialsCatalogue.DigitalCredentialsCatalogue,
  void
>("credentialsCatalogue/get", async (_, { getState }) => {
  const env = selectEnv(getState());
  const { WALLET_TA_BASE_URL } = getEnv(env);
  const itwVersion = selectItwVersion(getState());

  const wallet = new IoWallet({ version: itwVersion });
  return wallet.CredentialsCatalogue.fetchAndParseCatalogue(WALLET_TA_BASE_URL);
});
