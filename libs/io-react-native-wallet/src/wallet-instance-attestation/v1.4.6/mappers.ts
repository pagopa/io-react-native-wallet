import { createMapper } from "../../utils/mappers";
import { DecodedWalletInstanceAttestation } from "../api/types";
import { WalletInstanceAttestationJwt } from "./types";

export const mapToDecodedWalletInstanceAttestation = createMapper<
  WalletInstanceAttestationJwt,
  DecodedWalletInstanceAttestation
>((x) => x.payload, {
  outputSchema: DecodedWalletInstanceAttestation,
});
