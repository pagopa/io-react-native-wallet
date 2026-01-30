import type { WalletInstanceAttestationApi } from "../api";
import { withMapper, withMapperAsync } from "../../utils/mappers";
import { getAttestation } from "./issuing";
import { decode, verify } from "./utils";
import { mapToDecodedAttestationJwt } from "./mappers";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getAttestation,
  decode: withMapper(mapToDecodedAttestationJwt, decode),
  verify: withMapperAsync(mapToDecodedAttestationJwt, verify),
};
