import * as z from "zod";

import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";

/**
 * Create a signed DPoP token
 *
 * @param payload The payload to be included in the token.
 * @param crypto The crypto context that handles the key bound to the DPoP.
 *
 * @returns The signed crypto token.
 */
export const createDPopToken = async (
  payload: DPoPPayload,
  crypto: CryptoContext
): Promise<string> => {
  const jwk = await crypto.getPublicKey();
  return new SignJWT(crypto)
    .setPayload(payload)
    .setProtectedHeader({
      typ: "dpop+jwt",
      jwk,
    })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign();
};

export type DPoPPayload = z.infer<typeof DPoPPayload>;
export const DPoPPayload = z.object({
  jti: z.string(),
  htm: z.union([z.literal("POST"), z.literal("GET")]),
  htu: z.string(),
  ath: z.string().optional(),
});
