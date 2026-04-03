import type { WalletInstanceAttestationApi } from "../api";
import { withMapper, withMapperAsync } from "../../utils/mappers";
import { getAttestation } from "./issuing";
import { decode, verify } from "./utils";
import { mapToDecodedWalletInstanceAttestation } from "./mappers";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getAttestation,
  decode: withMapper(mapToDecodedWalletInstanceAttestation, decode),
  verify: withMapperAsync(mapToDecodedWalletInstanceAttestation, verify),
};
