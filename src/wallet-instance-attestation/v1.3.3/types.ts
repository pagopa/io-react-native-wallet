import * as z from "zod";
import { JWK } from "../../utils/jwk";
import { Jwt } from "../common/types";

const Status = z.object({
  status_list: z.object({
    idx: z.number(),
    uri: z.string(),
  }),
});

export type WalletAppAttestationJwt = z.infer<typeof WalletAppAttestationJwt>;
export const WalletAppAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("oauth-client-attestation+jwt"),
    })
  ),
  payload: z.intersection(
    Jwt.shape.payload,
    z.object({
      sub: z.string(),
      wallet_link: z.string().optional(),
      wallet_name: z.string().optional(),
      status: Status.optional(),
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
    })
  ),
});
