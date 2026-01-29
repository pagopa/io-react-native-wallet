import type { WalletInstanceAttestationApi } from "../api";
import { withMapper, withMapperAsync } from "../../utils/mappers";
import { getAttestation } from "./issuing";
import { decodeJwt, verifyJwt } from "./utils";
import { mapToDecodedAttestationJwt } from "./mappers";

export const WalletInstanceAttestation: WalletInstanceAttestationApi = {
  getAttestation,
  decodeJwt: withMapper(mapToDecodedAttestationJwt, decodeJwt),
  verifyJwt: withMapperAsync(mapToDecodedAttestationJwt, verifyJwt),
};
