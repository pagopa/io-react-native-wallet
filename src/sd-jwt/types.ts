import { JWK } from "../utils/jwk";
import { z } from "zod";

export const UnixTime = z.number().min(0).max(2147483647000);
export type UnixTime = z.infer<typeof UnixTime>;

export type ObfuscatedDisclosures = z.infer<typeof ObfuscatedDisclosures>;
export const ObfuscatedDisclosures = z.object({ _sd: z.array(z.string()) });

/**
 * A triple of values in the form of {salt, claim name, claim value} that represent a parsed disclosure.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-oauth-selective-disclosure-jwt-04
 * @see https://vcstuff.github.io/draft-terbu-sd-jwt-vc/draft-terbu-oauth-sd-jwt-vc.html
 */
export type Disclosure = z.infer<typeof Disclosure>;
export const Disclosure = z.tuple([
  /* salt */ z.string(),
  /* claim name */ z.string(),
  /* claim value */ z.unknown(),
]);

/**
 * Encoding depends on the serialization algorithm used when generating the disclosure tokens.
 * The SD-JWT reference itself take no decision about how to handle whitespaces in serialized objects.
 * For such reason, we may find conveninent to have encoded and decode values stored explicitly in the same structure.
 * Please note that `encoded` can always decode into `decode`, but `decode` may or may not be encoded with the same value of `encoded`
 *
 * @see https://www.ietf.org/id/draft-ietf-oauth-selective-disclosure-jwt-05.html#name-disclosures-for-object-prop
 */
export type DisclosureWithEncoded = {
  decoded: Disclosure;
  encoded: string;
};

export type SdJwt4VC = z.infer<typeof SdJwt4VC>;
export const SdJwt4VC = z.object({
  header: z.object({
    typ: z.literal("vc+sd-jwt"),
    alg: z.string(),
    kid: z.string().optional(),
    trust_chain: z.array(z.string()),
  }),
  payload: z.object({
    iss: z.string(),
    sub: z.string(),
    jti: z.string(),
    iat: UnixTime,
    exp: UnixTime,
    status: z.string(),
    cnf: z.object({
      jwk: JWK,
    }),
    type: z.literal("PersonIdentificationData"),
    verified_claims: z.object({
      verification: z.intersection(
        z.object({
          trust_framework: z.literal("eidas"),
          assurance_level: z.string(),
        }),
        ObfuscatedDisclosures
      ),
      claims: ObfuscatedDisclosures,
    }),
    _sd_alg: z.literal("sha-256"),
  }),
});
