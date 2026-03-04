import { sha256ToBase64, SignJWT } from "@pagopa/io-react-native-jwt";
import { decodeSdJwtSync } from "@sd-jwt/decode";
import { present } from "@sd-jwt/present";
import { digest } from "@sd-jwt/crypto-nodejs";
import type { Presentation } from "src/credential/presentation";
import { SdJwt4VCBase } from "./types";

export * from "./utils";

/**
 * Decode a given SD-JWT with Disclosures to get the parsed SD-JWT object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the SD-JWT.
 *
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 * @returns The parsed SD-JWT token and the parsed disclosures
 */
export const decode = (token: string) => {
  const decoded = decodeSdJwtSync(token, digest);

  const sdJwt = SdJwt4VCBase.parse({
    header: decoded.jwt.header,
    payload: decoded.jwt.payload,
  });
  const disclosures = decoded.disclosures.map((disclosure) => ({
    encoded: disclosure._digest,
    decoded: [disclosure.salt, disclosure.key, disclosure.value],
  }));
  return { sdJwt, disclosures };
};

/**
 * Prepares a Verified Presentation (VP) token to be sent as part of an
 * authorization response in an OpenID 4 Verifiable Presentations flow.
 *
 * @param nonce - The nonce provided by the relying party.
 * @param client_id - The client identifier of the relying party.
 * @param presentation - An object containing the verifiable credential, the claims to disclose,
 *                       and the cryptographic context for signing.
 * @returns An object containing the signed VP token (`vp_token`).
 *
 * @remarks
 *  1. The `disclose()` function is used to produce a token with only the requested claims.
 *  2. A KB-JWT is then signed, including sd_hash and `nonce`.
 *  3. The `vp_token` is composed of the disclosed VP and the KB-JWT.
 */
export const prepareVpToken = async (
  nonce: string,
  client_id: string,
  [verifiableCredential, presentationFrame, cryptoContext]: Presentation
): Promise<{
  vp_token: string;
}> => {
  // Produce a VP token with only requested claims from the verifiable credential
  const vp = await present(verifiableCredential, presentationFrame, digest);

  // <Issuer-signed JWT>~<Disclosure 1>~<Disclosure N>~
  const sd_hash = await sha256ToBase64(vp);

  const kbJwt = await new SignJWT(cryptoContext)
    .setProtectedHeader({
      typ: "kb+jwt",
      alg: "ES256",
    })
    .setPayload({
      sd_hash,
      nonce: nonce,
    })
    .setAudience(client_id)
    .setIssuedAt()
    .sign();
  // <Issuer-signed JWT>~<Disclosure 1>~...~<Disclosure N>~<KB-JWT>
  const vp_token = [vp, kbJwt].join("");

  return { vp_token };
};
