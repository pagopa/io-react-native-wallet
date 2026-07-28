import { createMapper } from "../../utils/mappers";
import { DecodedWalletUnitAttestation } from "../api/types";
import { WalletUnitAttestationJwt } from "./types";

export const mapToDecodedWalletUnitAttestation = createMapper<
  WalletUnitAttestationJwt,
  DecodedWalletUnitAttestation
>((x) => x.payload, {
  outputSchema: DecodedWalletUnitAttestation,
});
