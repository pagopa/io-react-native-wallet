import * as z from "zod";
import { UnixTime } from "../../utils/zod";
import { JWK } from "../../utils/jwk";

const Status = z.object({
  status_list: z.object({
    idx: z.number(),
    uri: z.string(),
  }),
});

/**
 * Common Wallet Unit Attestation shape. This object is
 * an abstraction over the version-specific JWTs.
 */
export type DecodedWalletUnitAttestation = z.infer<
  typeof DecodedWalletUnitAttestation
>;
export const DecodedWalletUnitAttestation = z.object({
  attested_keys: z.array(JWK),
  user_authentication: z.array(z.string()),
  key_storage: z.array(z.string()),
  status: Status,
  eudi_wallet_info: z.object({
    general_info: z.object({
      wallet_provider_name: z.string(),
      wallet_solution_id: z.string(),
      wallet_solution_version: z.string(),
    }),
    key_storage_info: z.object({
      keys_exportable: z.boolean(),
      storage_type: z.string(),
    }),
  }),
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
});

export type WalletAttestation = {
  format: string;
  attestation: string;
};

export type WalletAttestationRequestParams = {
  walletProviderBaseUrl: string;
  walletSolutionId: string;
  walletSolutionVersion: string;
};
