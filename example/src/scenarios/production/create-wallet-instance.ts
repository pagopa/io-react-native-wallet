import {
  WalletInstance,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "../types";

import { WALLET_PROVIDER_BASE_URL } from "@env";

const walletProviderBaseUrl = WALLET_PROVIDER_BASE_URL;

export default (integrityContext: IntegrityContext) => async () => {
  try {
    const createdWalletInstance = await WalletInstance.createWalletInstance({
      integrityContext,
      walletProviderBaseUrl,
    });

    console.log(createdWalletInstance);
    return result(createdWalletInstance);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
