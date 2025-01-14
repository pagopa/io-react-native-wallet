import { WalletInstance } from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import {
  generateIntegrityHardwareKeyTag,
  getIntegrityContext,
} from "../utils/integrity";
import {
  instanceReset,
  selectInstanceKeyTag,
} from "../store/reducers/instance";
import { WALLET_PROVIDER_BASE_URL } from "@env";

/**
 * Thunk to create a new wallet instance.
 */
export const createWalletInstanceThunk = createAppAsyncThunk(
  "walletinstance/create",
  async (_) => {
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
