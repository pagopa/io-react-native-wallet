import { IoWallet } from "@io-app-it-wallet/io-react-native-wallet";

import { instanceReset } from "../store/instance";
import { selectXUserId } from "../store/reducers/user";
import { selectInstanceKeyTag } from "../store/selectors/instance";
import { getEnv, ITW_VERSION } from "../utils/environment";
import appFetch from "../utils/fetch";
import {
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
    const wallet = new IoWallet({ version: ITW_VERSION });

    // Get env
    const { WALLET_PROVIDER_BASE_URL } = getEnv();

    const integrityKeyTag = await generateIntegrityHardwareKeyTag();
    const integrityContext = getIntegrityContext(integrityKeyTag);

    await wallet.WalletInstance.createWalletInstance({
      appFetch,
      integrityContext,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
      xUserId: selectXUserId(getState()),
    });

    return integrityKeyTag;
  },
);

export const revokeWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/revoke",
  async (_, { dispatch, getState }) => {
    const { WALLET_PROVIDER_BASE_URL } = getEnv();
    const integrityKeyTag = selectInstanceKeyTag(getState());
    if (!integrityKeyTag) {
      throw new Error("Integrity key not found");
    }

    const wallet = new IoWallet({ version: ITW_VERSION });
    await wallet.WalletInstance.revokeWalletInstance({
      appFetch,
      id: integrityKeyTag,
      walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
    });

    dispatch(instanceReset());
  },
);
