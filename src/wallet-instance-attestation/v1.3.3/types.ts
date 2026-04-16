import * as z from "zod";
import { Jwt } from "../common/types";

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
      sub: z.string(),
    })
  ),
});

export type WalletInstanceAttestationResponse = z.infer<
  typeof WalletInstanceAttestationResponse
>;
export const WalletInstanceAttestationResponse = z.object({
  wallet_instance_attestation: z.string(),
});
