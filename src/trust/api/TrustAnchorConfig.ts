import * as z from "zod";
import { JWK } from "../../utils/jwk";

/**
 * Common Trust Anchor configuration
 * @public
 */
export type TrustAnchorConfig = z.infer<typeof TrustAnchorConfig>;
export const TrustAnchorConfig = z.object({
  jwt: z.object({
    header: z.object({
      typ: z.literal("entity-statement+jwt"),
      alg: z.string(),
      kid: z.string(),
    }),
  }),
  keys: z.array(JWK),
  federation_fetch_endpoint: z.string().optional(),
  federation_list_endpoint: z.string().optional(),
  federation_resolve_endpoint: z.string().optional(),
});
