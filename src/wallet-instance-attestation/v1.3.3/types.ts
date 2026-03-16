import * as z from "zod";
import { JWK } from "../../utils/jwk";
import { Jwt } from "../common/types";

const Status = z.object({
  status_list: z.object({
    idx: z.number(),
    uri: z.string(),
  }),
});

const EudiWalletGeneralInfo = z.object({
  wallet_provider_name: z.string(),
  wallet_solution_id: z.string(),
  wallet_solution_version: z.string(),
});

export type WalletInstanceAttestationJwt = z.infer<
  typeof WalletInstanceAttestationJwt
>;
export const WalletInstanceAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("oauth-client-attestation+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      eudi_wallet_info: z.object({
        general_info: EudiWalletGeneralInfo,
      }),
    })
  ),
});

export type WalletUnitAttestationJwt = z.infer<typeof WalletUnitAttestationJwt>;
export const WalletUnitAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("key-attestation+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      attested_keys: z.array(JWK),
      user_authentication: z.array(z.string()),
      key_storage: z.array(z.string()),
      status: Status,
      eudi_wallet_info: z.object({
        general_info: EudiWalletGeneralInfo,
        key_storage_info: z.object({
          keys_exportable: z.boolean(),
          storage_type: z.string(),
        }),
      }),
    })
  ),
});

export type WalletInstanceAttestationResponse = z.infer<
  typeof WalletInstanceAttestationResponse
>;
export const WalletInstanceAttestationResponse = z.object({
  wallet_instance_attestation: z.string(),
});

export type WalletUnitAttestationResponse = z.infer<
  typeof WalletUnitAttestationResponse
>;
export const WalletUnitAttestationResponse = z.object({
  wallet_unit_attestation: z.string(),
});
