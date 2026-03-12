import { UnimplementedFeatureError } from "../../utils/errors";
import type { WalletInstanceAttestationApi } from "../api";
import { getAttestation } from "./issuing";
import { getWalletUnitAttestation } from "./wua";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getWalletUnitAttestation,
  getAttestation,
  decode: () => {
    throw new UnimplementedFeatureError("decode", "1.3.3");
  },
  verify: () => {
    throw new UnimplementedFeatureError("verify", "1.3.3");
  },
};
