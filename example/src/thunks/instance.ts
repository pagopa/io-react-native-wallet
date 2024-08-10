import { WalletInstance } from "@pagopa/io-react-native-wallet";
import { WALLET_PROVIDER_BASE_URL } from "@env";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import {
  ensureIntegrityServiceIsReady,
  generateIntegrityHardwareKeyTag,
  getIntegrityContext,
} from "../utils/integrity";

const walletProviderBaseUrl = WALLET_PROVIDER_BASE_URL;

export const createWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/create",
  async () => {
    await ensureIntegrityServiceIsReady();
    const integrityKeyTag = await generateIntegrityHardwareKeyTag();
    const integrityContext = getIntegrityContext(integrityKeyTag);

    await WalletInstance.createWalletInstance({
      integrityContext,
      walletProviderBaseUrl,
      appFetch,
    });

    return integrityKeyTag;
  }
);
