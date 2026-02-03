import * as z from "zod";
import { JWK } from "../../../utils/jwk";

/**
 * Common Relying Party configuration
 */
export type RelyingPartyConfig = z.infer<typeof RelyingPartyConfig>;
export const RelyingPartyConfig = z.object({
  subject: z.string(),
  keys: z.array(JWK),
  organization_name: z.string().optional(),
  homepage_uri: z.string().optional(),
  policy_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  contacts: z.array(z.string()).optional(),
});
