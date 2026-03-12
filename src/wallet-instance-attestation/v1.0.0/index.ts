import type { WalletInstanceAttestationApi } from "../api";
import { withMapper, withMapperAsync } from "../../utils/mappers";
import { getAttestation, getWalletUnitAttestation } from "./issuing";
import { decode, verify } from "./utils";
import { mapToDecodedAttestationJwt } from "./mappers";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getAttestation,
  getWalletUnitAttestation,
  decode: withMapper(mapToDecodedAttestationJwt, decode),
  verify: withMapperAsync(mapToDecodedAttestationJwt, verify),
};
