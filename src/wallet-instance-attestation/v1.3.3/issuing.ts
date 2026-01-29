import { UnimplementedFeatureError } from "../../utils/errors";
import type { WalletInstanceAttestationApi } from "../api";

export const getAttestation: WalletInstanceAttestationApi["getAttestation"] =
  () => {
    throw new UnimplementedFeatureError("getAttestation", "1.3.3");
  };
