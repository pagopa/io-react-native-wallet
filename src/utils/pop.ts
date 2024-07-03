import * as z from "zod";

import { SignJWT, type CryptoContext } from "@pagopa/io-react-native-jwt";

/**
 * Create a signed PoP token
 *
 * @param payload The payload to be included in the token.
 * @param crypto The crypto context that handles the key bound to the DPoP.
 *
 * @returns The signed crypto token.
 */
export const createPopToken = async (
  payload: PoPPayload,
  crypto: CryptoContext
): Promise<string> => {
  const kid = await crypto.getPublicKey().then((_) => _.kid);
  return new SignJWT(crypto)
    .setPayload(payload)
    .setProtectedHeader({
      typ: "jwt-client-attestation-pop",
      kid,
    })
    .setIssuedAt()
    .setExpirationTime("5min")
    .sign();
};

export type PoPPayload = z.infer<typeof PoPPayload>;
export const PoPPayload = z.object({
  jti: z.string(),
  aud: z.string(),
  iss: z.string(),
});
