import * as z from "zod";

import { Jwt } from "../../wallet-instance-attestation/common/types";
import { DecodedKeyAttestation } from "../api/types";

export type KeyAttestationJwt = z.infer<typeof KeyAttestationJwt>;
export const KeyAttestationJwt = z.object({
  header: z.intersection(
    Jwt.shape.header,
    z.object({
      typ: z.literal("key-attestation+jwt"),
    }),
  ),
  payload: DecodedKeyAttestation, // The payload type matches the public API
});

export type KeyAttestationResponse = z.infer<
  typeof KeyAttestationResponse
>;
export const KeyAttestationResponse = z.object({
  key_attestation: z.string(),
});
