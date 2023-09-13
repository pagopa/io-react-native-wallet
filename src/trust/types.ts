import { UnixTime } from "../sd-jwt/types";
import { JWK } from "../utils/jwk";
import * as z from "zod";

export const TrustMark = z.object({ id: z.string(), trust_mark: z.string() });
export type TrustMark = z.infer<typeof TrustMark>;

export type EntityStatement = z.infer<typeof EntityStatement>;
export const EntityStatement = z.object({
  header: z.object({
    typ: z.literal("entity-statement+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
    iss: z.string(),
    sub: z.string(),
    jwks: z.object({ keys: z.array(JWK) }),
    trust_marks: z.array(TrustMark),
    iat: z.number(),
    exp: z.number(),
  }),
});

export type EntityConfiguration = z.infer<typeof EntityConfiguration>;
export const EntityConfiguration = z.object({
  header: z.object({
    typ: z.literal("entity-statement+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
    exp: UnixTime,
    iat: UnixTime,
    iss: z.string(),
    sub: z.string(),
    jwks: z.object({
      keys: z.array(JWK),
    }),
    metadata: z.object({
      federation_entity: z.object({
        organization_name: z.string(),
        homepage_uri: z.string(),
        policy_uri: z.string(),
        logo_uri: z.string(),
        contacts: z.array(z.string()),
      }),
    }),
    authority_hints: z.array(z.string()),
  }),
});

export type TrustAnchorEntityConfiguration = z.infer<
  typeof TrustAnchorEntityConfiguration
>;
export const TrustAnchorEntityConfiguration = EntityConfiguration;
