import * as z from "zod";

import uuid from "react-native-uuid";
import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { createCryptoContextFor } from "./crypto";
import { generate, deleteKey } from "@pagopa/io-react-native-crypto";

/**
 * Create a signed DPoP token
 *
 * @param payload The payload to be included in the token.
 * @param crypto The crypto context that handles the key bound to the DPoP. If not provided, a context will be created with an ephemeral key, which will be destroyed after use
 *
 * @returns The signed crypto token.
 */
export const createDPopToken = async (
  payload: DPoPPayload,
  crypto?: CryptoContext
): Promise<string> => {
  const execute = async (ctx: CryptoContext) => {
    const jwk = await ctx.getPublicKey();
    return new SignJWT(ctx)
      .setPayload(payload)
      .setProtectedHeader({
        typ: "dpop+jwt",
        jwk,
      })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign();
  };

  // Use the provided context if provided
  if (crypto) {
    return execute(crypto);
  }

  // No context has been provided, use an ephemeral key to be destroyed after use
  const keytag = `ephemeral-${uuid.v4()}`;
  await generate(keytag);
  const token = await execute(createCryptoContextFor(keytag));
  await deleteKey(keytag);
  return token;
};

export type DPoPPayload = z.infer<typeof DPoPPayload>;
export const DPoPPayload = z.object({
  jti: z.string(),
  htm: z.union([z.literal("POST"), z.literal("GET")]),
  htu: z.string(),
  ath: z.string().optional(),
});
