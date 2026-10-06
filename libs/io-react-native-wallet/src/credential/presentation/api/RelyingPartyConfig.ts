import { jsonWebKeySchema } from "@pagopa/io-wallet-oid-federation";
import * as z from "zod";

import { FederationEntityMetadata } from "../../../trust/common/types";

/**
 * Common Relying Party configuration
 */
export type RelyingPartyConfig = z.infer<typeof RelyingPartyConfig>;
export const RelyingPartyConfig = z.object({
  /** @deprecated JARM legacy (v1.0 only) */
  authorization_encrypted_response_alg: z.string().optional(),
  /** @deprecated JARM legacy (v1.0 only) */
  authorization_encrypted_response_enc: z.string().optional(),
  /** @since 1.3.3 */
  encrypted_response_enc_values_supported: z
    .array(z.string())
    .min(1)
    .optional(),
  // UI (from federation_entity)
  federation_entity: FederationEntityMetadata,
  jwks: z.object({
    keys: z.array(jsonWebKeySchema),
  }),
  subject: z.string().optional(),
});
