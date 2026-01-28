import { z } from "zod";

/**
 * Common Trust Anchor configuration
 */
export type TrustAnchorConfig = z.infer<typeof TrustAnchorConfig>;
export const TrustAnchorConfig = z.object({});
