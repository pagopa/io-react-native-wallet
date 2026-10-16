import { SignJWT } from "@pagopa/io-react-native-jwt";
import * as z from "zod";

import { Signer, toCryptoContext } from "./crypto";

/**
 * Create a signed PoP token
 *
 * @param payload The payload to be included in the token.
 * @param signer The signer of the key bound to the PoP.
 *
 * @returns The signed crypto token.
 */
export const createPopToken = async (
  payload: PoPPayload,
  signer: Signer,
): Promise<string> => {
  const publicKey = await signer.getPublicKey();
  return new SignJWT(toCryptoContext(signer))
    .setProtectedHeader({
      kid: publicKey.kid,
      typ: "oauth-client-attestation-pop+jwt",
    })
    .setPayload(payload)
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
