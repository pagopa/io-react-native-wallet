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
