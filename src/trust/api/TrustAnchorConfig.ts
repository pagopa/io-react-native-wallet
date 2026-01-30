import * as z from "zod";
import { JWK } from "../../utils/jwk";

/**
 * Common Trust Anchor configuration
 * @public
 */
export type TrustAnchorConfig = z.infer<typeof TrustAnchorConfig>;
export const TrustAnchorConfig = z.object({
  header: z.object({
    typ: z.literal("entity-statement+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
    keys: z.array(JWK),
    federation_fetch_endpoint: z.string(),
    federation_list_endpoint: z.string(),
    federation_resolve_endpoint: z.string(),
  }),
});
