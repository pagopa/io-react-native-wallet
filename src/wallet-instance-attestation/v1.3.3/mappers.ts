import { createMapper } from "../../utils/mappers";
import { DecodedWalletInstanceAttestation } from "../api/types";
import { WalletInstanceAttestationJwt } from "./types";

export const mapToDecodedWalletInstanceAttestation = createMapper<
  WalletInstanceAttestationJwt,
  DecodedWalletInstanceAttestation
>(
  ({ payload }) => {
    const { eudi_wallet_info, ...rest } = payload;
    return {
      ...rest,
      wallet_provider_name: eudi_wallet_info.general_info.wallet_provider_name,
      wallet_solution_id: eudi_wallet_info.general_info.wallet_solution_id,
    };
  },
  { outputSchema: DecodedWalletInstanceAttestation }
);
