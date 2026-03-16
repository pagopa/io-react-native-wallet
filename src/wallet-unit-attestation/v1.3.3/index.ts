import { withMapper } from "../../utils/mappers";
import type { WalletUnitAttestationApi } from "../api";
import { decode } from "./utils";
import { mapToDecodedWalletUnitAttestation } from "./mappers";
import { getAttestation } from "./issuing";

export const WalletUnitAttestation: WalletUnitAttestationApi = {
  getAttestation,
  decode: withMapper(mapToDecodedWalletUnitAttestation, decode),
};
