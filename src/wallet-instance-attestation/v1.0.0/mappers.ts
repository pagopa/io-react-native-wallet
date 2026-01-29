import { createMapper } from "../../utils/mappers";
import type { DecodedAttestationJwt } from "../api/types";
import type { WalletInstanceAttestationJwt } from "./types";

export const mapToDecodedAttestationJwt = createMapper<
  WalletInstanceAttestationJwt,
  DecodedAttestationJwt
>((x) => x.payload);
