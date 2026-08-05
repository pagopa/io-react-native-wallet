import type { WalletInstanceAttestationApi } from "../api";

import { withMapper, withMapperAsync } from "../../utils/mappers";
import { getAttestation } from "./issuing";
import { mapToDecodedWalletInstanceAttestation } from "./mappers";
import { decode, verify } from "./utils";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  decode: withMapper(mapToDecodedWalletInstanceAttestation, decode),
  getAttestation,
  verify: withMapperAsync(mapToDecodedWalletInstanceAttestation, verify),
};
