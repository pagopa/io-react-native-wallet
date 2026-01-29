import type { WalletInstanceAttestationApi } from "../api";
import { getAttestation } from "./issuing";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getAttestation,
};
