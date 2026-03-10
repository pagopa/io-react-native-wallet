import * as z from "zod";
import { JWK } from "../../utils/jwk";
import { FederationEntityMetadata } from "../common/types";

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
  federation_entity: FederationEntityMetadata,
});
