import * as z from "zod";
import { jsonWebKeySchema } from "@openid-federation/core";

/**
 * Common Relying Party configuration
 */
export type RelyingPartyConfig = z.infer<typeof RelyingPartyConfig>;
export const RelyingPartyConfig = z.object({
  subject: z.string().optional(),
  jwks: z.object({
    keys: z.array(jsonWebKeySchema),
  }),
  // UI (from federation_entity)
  organization_name: z.string().optional(),
  homepage_uri: z.string().optional(),
  policy_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  contacts: z.array(z.string()).optional(),
  // JARM legacy (v1.0 only)
  authorization_encrypted_response_alg: z.string().optional(),
  authorization_encrypted_response_enc: z.string().optional(),
  // 1.3-only fields
  encrypted_response_enc_values_supported: z
    .array(z.string())
    .min(1)
    .optional(),
});
