import { UnimplementedFeatureError } from "src/utils/errors";
import type { WalletUnitAttestationApi } from "../api";

export const WalletUnitAttestation: WalletUnitAttestationApi = {
  getAttestation() {
    throw new UnimplementedFeatureError(
      "WalletUnitAttestation.getAttestation",
      "1.0.0"
    );
  },
  decode() {
    throw new UnimplementedFeatureError(
      "WalletUnitAttestation.decode",
      "1.0.0"
    );
  },
};
