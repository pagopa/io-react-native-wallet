import type { WalletInstanceApi } from "../api";
import {
  createWalletInstance,
  revokeWalletInstance,
  getWalletInstanceStatus,
  getCurrentWalletInstanceStatus,
} from "../common/wallet-instance";

export const WalletInstance: WalletInstanceApi = {
  createWalletInstance,
  revokeWalletInstance,
  getWalletInstanceStatus,
  getCurrentWalletInstanceStatus,
};
