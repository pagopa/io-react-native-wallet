import { JWK } from "../utils/jwk";
import { UnixTime } from "../sd-jwt/types";
import * as z from "zod";

export type RequestObject = z.infer<typeof RequestObject>;
export const RequestObject = z.object({
  header: z.object({
    typ: z.literal("JWT"),
    alg: z.string(),
    kid: z.string(),
    trust_chain: z.array(z.string()),
  }),
  payload: z.object({
    iss: z.string(),
    iat: UnixTime,
    exp: UnixTime,
    state: z.string(),
    nonce: z.string(),
    response_uri: z.string(),
    response_type: z.literal("vp_token"),
    response_mode: z.literal("direct_post.jwt"),
    client_id: z.string(),
    client_id_scheme: z.literal("entity_id"),
    scope: z.string(),
  }),
});

// TODO: This types is WIP in technical rules
export type RpEntityConfiguration = z.infer<typeof RpEntityConfiguration>;
export const RpEntityConfiguration = z.object({
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
      wallet_relying_party: z.object({
        application_type: z.string(),
        client_id: z.string(),
        client_name: z.string(),
        jwks: z.object({
          keys: z.array(JWK),
        }),
        contacts: z.array(z.string()),
      }),
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

export type QRCodePayload = z.infer<typeof QRCodePayload>;
export const QRCodePayload = z.object({
  protocol: z.literal("eudiw:"),
  resource: z.string(), // TODO: refine to known paths using literals
  clientId: z.string(),
  requestURI: z.string(),
});

/**
 * A pair that associate a tokenized Verified Credential with the claims presented or requested to present.
 */
export type Presentation = [
  /* verified credential token */ string,
  /* claims */ string[]
];
