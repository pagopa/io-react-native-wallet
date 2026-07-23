import type { WalletUnitAttestationApi } from "../api";

import { withMapper } from "../../utils/mappers";
import { getAttestation } from "./issuing";
import { mapToDecodedWalletUnitAttestation } from "./mappers";
import { decode } from "./utils";

export const WalletUnitAttestation: WalletUnitAttestationApi = {
  decode: withMapper(mapToDecodedWalletUnitAttestation, decode),
  getAttestation,
  isSupported: true,
};
