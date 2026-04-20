import {
  IoWallet,
  type CredentialsCatalogue,
} from "@pagopa/io-react-native-wallet";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { getEnv } from "../utils/environment";
import { createAppAsyncThunk } from "./utils";
import { selectCredentialsCatalogue } from "../store/reducers/credentialsCatalogue";

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

export const getCredentialsCatalogueTranslationsThunk = createAppAsyncThunk<
  CredentialsCatalogue.CatalogueTranslations,
  void
>("credentialsCatalogue/getTranslations", async (_, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const catalogue = selectCredentialsCatalogue(getState());

  if (!catalogue) {
    throw new Error("Fetch the catalogue first before fetching translations");
  }

  const wallet = new IoWallet({ version: itwVersion });
  return wallet.CredentialsCatalogue.fetchTranslations(
    {
      catalogue: catalogue.localization,
      authenticSources: catalogue.as_localization,
    },
    ["it"]
  );
});
