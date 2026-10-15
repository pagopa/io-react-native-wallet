import { JWT } from "@pagopa/io-react-native-jwt";
import * as z from "zod";

import type { Signer } from "./crypto";

/**
 * Create a signed DPoP token
 *
 * @param payload The payload to be included in the token.
 * @param signer The signer of the key bound to the DPoP.
 *
 * @returns The signed crypto token.
 */
export const createDPopToken = async (
  payload: DPoPPayload,
  signer: Signer,
): Promise<string> => {
  const publicKey = await signer.getPublicKey();
  return new JWT(publicKey)
    .setProtectedHeader({ jwk: publicKey, typ: "dpop+jwt" })
    .setPayload(payload)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign((v) => signer.sign(v));
};

export type DPoPPayload = z.infer<typeof DPoPPayload>;
export const DPoPPayload = z.object({
  ath: z.string().optional(),
  htm: z.enum(["POST", "GET"]),
  htu: z.string(),
  jti: z.string(),
});
