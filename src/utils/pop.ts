import { type CryptoContext, SignJWT } from "@pagopa/io-react-native-jwt";
import * as z from "zod";

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
  crypto: CryptoContext,
): Promise<string> => {
  const kid = await crypto.getPublicKey().then((_) => _.kid);
  return new SignJWT(crypto)
    .setPayload(payload)
    .setProtectedHeader({
      kid,
      typ: "oauth-client-attestation-pop+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("5min")
    .sign();
};

export type PoPPayload = z.infer<typeof PoPPayload>;
export const PoPPayload = z.object({
  aud: z.string(),
  iss: z.string(),
  jti: z.string(),
});
