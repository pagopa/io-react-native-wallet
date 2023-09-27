import { UnixTime } from "../sd-jwt/types";
import * as z from "zod";

export type RequestObject = z.infer<typeof RequestObject>;
export const RequestObject = z.object({
  header: z.object({
    // FIXME: SIW-421 type field must be either required or omitted, optional isn't useful
    typ: z.literal("JWT").optional(),
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

export type QRCodePayload = z.infer<typeof QRCodePayload>;
export const QRCodePayload = z.object({
  protocol: z.string(),
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
