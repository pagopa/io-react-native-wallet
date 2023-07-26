import * as z from "zod";

import { SignJWT } from "@pagopa/io-react-native-jwt";
import type { JWK } from "./jwk";

export const getUnsignedDPop = (jwk: JWK, payload: DPoPPayload): string => {
  const dPop = new SignJWT(payload)
    .setProtectedHeader({
      alg: "ES256",
      typ: "dpop+jwt",
      jwk,
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .toSign();
  return dPop;
};

export type DPoPPayload = z.infer<typeof DPoPPayload>;
export const DPoPPayload = z.object({
  jti: z.string(),
  htm: z.union([z.literal("POST"), z.literal("GET")]),
  htu: z.string(),
  ath: z.string().optional(),
});
