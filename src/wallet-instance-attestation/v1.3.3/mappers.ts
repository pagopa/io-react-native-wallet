import { createMapper } from "../../utils/mappers";
import { DecodedWalletInstanceAttestation } from "../api/types";
import { WalletInstanceAttestationJwt } from "./types";

export const mapToDecodedWalletInstanceAttestation = createMapper<
  WalletInstanceAttestationJwt,
  DecodedWalletInstanceAttestation
>(
  ({ payload }) => ({
    ...payload,
    wallet_name: payload.eudi_wallet_info.general_info.wallet_provider_name,
  }),
  {
    outputSchema: DecodedWalletInstanceAttestation,
  }
);
