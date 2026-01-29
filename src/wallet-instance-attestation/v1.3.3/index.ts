import { UnimplementedFeatureError } from "../../utils/errors";
import type { WalletInstanceAttestationApi } from "../api";
import { getAttestation } from "./issuing";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getAttestation,
  decodeJwt: () => {
    throw new UnimplementedFeatureError("decodeJwt", "1.3.3");
  },
  verifyJwt: () => {
    throw new UnimplementedFeatureError("verifyJwt", "1.3.3");
  },
};
