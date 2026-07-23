import { IoWallet } from "@pagopa/io-react-native-wallet";

import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import {
  instanceReset,
  selectInstanceKeyTag,
} from "../store/reducers/instance";
import { isAndroid } from "../utils/device";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import {
  ensureIntegrityServiceIsReady,
  generateIntegrityHardwareKeyTag,
  getIntegrityContext,
} from "../utils/integrity";
import { createAppAsyncThunk } from "./utils";

/**
 * Thunk to create a new wallet instance.
 */
export const createWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/create",
  async (_, { getState }) => {
    const itwVersion = selectItwVersion(getState());
    const wallet = new IoWallet({ version: itwVersion });

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

    await wallet.WalletInstance.createWalletInstance({
      appFetch,
      integrityContext,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
    });

    return integrityKeyTag;
  },
);

export const revokeWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/revoke",
  async (_, { dispatch, getState }) => {
    const env = selectEnv(getState());
    const { WALLET_PROVIDER_BASE_URL } = getEnv(env);
    const integrityKeyTag = selectInstanceKeyTag(getState());
    const itwVersion = selectItwVersion(getState());

    if (!integrityKeyTag) {
      throw new Error("Integrity key not found");
    }

    const wallet = new IoWallet({ version: itwVersion });
    await wallet.WalletInstance.revokeWalletInstance({
      appFetch,
      id: integrityKeyTag,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
    });

    dispatch(instanceReset());
  },
);
