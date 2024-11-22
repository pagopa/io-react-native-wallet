import { WalletInstance } from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import {
  ensureIntegrityServiceIsReady,
  generateIntegrityHardwareKeyTag,
  getIntegrityContext,
} from "../utils/integrity";
import { selectEnv } from "../store/reducers/environment";
import {
  instanceReset,
  selectInstanceKeyTag,
} from "../store/reducers/instance";
import { getEnv } from "../utils/environment";
import { isAndroid } from "../utils/device";

/**
 * Thunk to create a new wallet instance.
 */
export const createWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/create",
  async (_, { getState }) => {
    // Get env
    const env = selectEnv(getState());
    const { GOOGLE_CLOUD_PROJECT_NUMBER, WALLET_PROVIDER_BASE_URL } =
      getEnv(env);

    const googleCloudProjectNumber = isAndroid
      ? GOOGLE_CLOUD_PROJECT_NUMBER
      : undefined;

    await ensureIntegrityServiceIsReady(googleCloudProjectNumber);
    const integrityKeyTag = await generateIntegrityHardwareKeyTag();
    const integrityContext = getIntegrityContext(integrityKeyTag);

    await WalletInstance.createWalletInstance({
      integrityContext,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      appFetch,
    });

    return integrityKeyTag;
  }
);

export const revokeWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/revoke",
  async (_, { getState, dispatch }) => {
    const env = selectEnv(getState());
    const { WALLET_PROVIDER_BASE_URL } = getEnv(env);
    const integrityKeyTag = selectInstanceKeyTag(getState());

    if (!integrityKeyTag) {
      throw new Error("Integrity key not found");
    }

    await WalletInstance.revokeWalletInstance({
      id: integrityKeyTag,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      appFetch,
    });

    dispatch(instanceReset());
  }
);
