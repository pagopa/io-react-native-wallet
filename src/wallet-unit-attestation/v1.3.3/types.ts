import * as z from "zod";
import { Jwt } from "../../wallet-instance-attestation/common/types";
import { DecodedWalletUnitAttestation } from "../api/types";

export type WalletUnitAttestationJwt = z.infer<typeof WalletUnitAttestationJwt>;
export const WalletUnitAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("key-attestation+jwt"),
    })
  ),
  payload: DecodedWalletUnitAttestation, // The payload type matches the public API
});

export type WalletUnitAttestationResponse = z.infer<
  typeof WalletUnitAttestationResponse
>;
export const WalletUnitAttestationResponse = z.object({
  wallet_unit_attestation: z.string(),
});
