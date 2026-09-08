import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { FederationEntityMetadata } from "../common/types";

/**
 * Common Trust Anchor configuration
 * @public
 */
export type TrustAnchorConfig = z.infer<typeof TrustAnchorConfig>;
export const TrustAnchorConfig = z.object({
  federation_entity: FederationEntityMetadata,
  jwt: z.object({
    header: z.object({
      alg: z.string(),
      kid: z.string(),
      typ: z.literal("entity-statement+jwt"),
    }),
  }),
  keys: z.array(JWK),
});
