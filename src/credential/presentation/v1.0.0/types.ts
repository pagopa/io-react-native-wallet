import * as z from "zod";
import { UnixTime } from "../../../utils/zod";
import { ErrorResponse } from "../api/types";

export type RequestObjectPayload = z.infer<typeof RequestObjectPayload>;
export const RequestObjectPayload = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string(),
  nonce: z.string(),
  response_uri: z.string(),
  request_uri_method: z.string().optional(),
  response_type: z.literal("vp_token"),
  response_mode: z.literal("direct_post.jwt"),
  client_id: z.string(),
  dcql_query: z.record(z.string(), z.any()), // Validation happens within the `dcql` library, no need to duplicate it here
  scope: z.string().optional(),
  wallet_nonce: z.string().optional(),
});

/**
 * Authorization Response payload sent to the Relying Party.
 */
export type DirectAuthorizationBodyPayload = z.infer<
  typeof DirectAuthorizationBodyPayload
>;
export const DirectAuthorizationBodyPayload = z.union([
  z.object({
    vp_token: z.record(z.string(), z.string()),
  }),
  z.object({ error: ErrorResponse, error_description: z.string() }),
]);

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string().optional(),
  response_code: z.string().optional(),
  redirect_uri: z.string().optional(),
});

export type CredentialFormat =
  | {
      format: "dc+sd-jwt";
      vct: string;
    }
  | {
      format: "mso_mdoc";
      doctype: string;
    };

export type EvaluatedDisclosure = {
  namespace?: string;
  name: string;
  value: unknown;
};

/**
 * An object that defines claims to disclose. Nested claims must use a nested structure.
 * @example { name: true, address: { country: true } }
 */
export type PresentationFrame = {
  [k: string]: boolean | undefined | PresentationFrame;
};

// === Disclosure ============================================================

export const SdDisclosureSchema = z.object({
  salt: z.string(),
  key: z.string().optional(),
  value: z.unknown(),
  _digest: z.string().optional(),
  _encoded: z.string().optional(),
});

export type SdDisclosure = z.infer<typeof SdDisclosureSchema>;

// === JWT ===================================================================

export const SdJwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.string(),
  kid: z.string().optional(),
  trust_chain: z.array(z.string()).optional(),
  x5c: z.array(z.string()).optional(),
  vctm: z.array(z.string()).optional(),
});

export const SdJwtPayloadSchema = z
  .object({
    iss: z.string(),
    iat: z.number().optional(),
    exp: z.number(),
    vct: z.string(),
    _sd_alg: z.literal("sha-256"),
    _sd: z.array(z.string()),
    cnf: z.object({
      jwk: z.record(z.unknown()),
    }),

    status: z
      .object({
        identifier_list: z
          .object({
            id: z.string(),
            uri: z.string(),
          })
          .optional(),
        status_list: z
          .object({
            idx: z.number(),
            uri: z.string(),
          })
          .optional(),
      })
      .optional(),

    issuing_authority: z.string().optional(),
    issuing_country: z.string().optional(),

    "vct#integrity": z.string().optional(),

    sub: z.string().optional(),
  })
  .passthrough();

export const SdJwtCoreSchema = z.object({
  header: SdJwtHeaderSchema,
  payload: SdJwtPayloadSchema,
  signature: z.string(),
  encoded: z.string(),
});

export type SdJwtCore = z.infer<typeof SdJwtCoreSchema>;

// === KB JWT ================================================================

export const SdKbJwtSchema = z.object({
  header: z.record(z.unknown()),
  payload: z.record(z.unknown()),
  signature: z.string(),
  encoded: z.string(),
});

// === SD-JWT DECODED ========================================================

export const SdJwtDecodedSchema = z.object({
  jwt: SdJwtCoreSchema,
  disclosures: z.array(SdDisclosureSchema),
  kbJwt: SdKbJwtSchema.optional(),
});

export type SdJwtDecoded = z.infer<typeof SdJwtDecodedSchema>;
