import { JWK } from "src/utils/jwk";
import * as z from "zod";


export const TrustAnchorEntityConfigurationPayload = z.object({
    iss: z.string(),
    sub: z.string(),
    jwks: z.object({keys: z.array(JWK)}),
    iat: z.number(),
    exp: z.number(),
    metadata: z.object({
      federation_entity: z.object({
        federation_fetch_endpoint: z.string(),
        federation_resolve_endpoint: z.string(),
        federation_trust_mark_status_endpoint: z.string(),
        homepage_uri: z.string(),
        name: z.string(),
        federation_list_endpoint: z.string(),
      }),
    }),
  });
  export type TrustAnchorEntityConfigurationPayload = z.infer<
    typeof TrustAnchorEntityConfigurationPayload
  >;
  
  export const TrustMark = z.object({ id: z.string(), trust_mark: z.string() });
  export type TrustMark = z.infer<typeof TrustMark>;
  
  export const EntityStatementHeader = z.object({
    typ: z.literal("entity-statement+jwt"),
    alg: z.string(),
    kid: z.string(),
  });
  export type EntityStatementHeader = z.infer<typeof EntityStatementHeader>;
  
  export const EntityStatementPayload = z.object({
    iss: z.string(),
    sub: z.string(),
    jwks: z.object({keys: z.array(JWK)}),
    trust_marks: z.array(TrustMark),
    iat: z.number(),
    exp: z.number(),
  });
  
  export type EntityStatementPayload = z.infer<typeof EntityStatementPayload>;
  
