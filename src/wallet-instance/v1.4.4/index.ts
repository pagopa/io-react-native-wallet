import type { WalletInstanceApi } from "../api";

import {
  createWalletInstance,
  getCurrentWalletInstanceStatus,
  getWalletInstanceStatus,
  revokeWalletInstance,
} from "../common/wallet-instance";

export const WalletInstance: WalletInstanceApi = {
  createWalletInstance,
  getCurrentWalletInstanceStatus,
  getWalletInstanceStatus,
  revokeWalletInstance,
};
