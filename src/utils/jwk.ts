import { z } from "zod";

export type JWK = z.infer<typeof JWK>;
export const JWK = z.object({
  /** JWK "alg" (Algorithm) Parameter. */
  alg: z.string().optional(),
  crv: z.string().optional(),
  d: z.string().optional(),
  dp: z.string().optional(),
  dq: z.string().optional(),
  e: z.string().optional(),
  /** JWK "ext" (Extractable) Parameter. */
  ext: z.boolean().optional(),
  k: z.string().optional(),
  /** JWK "key_ops" (Key Operations) Parameter. */
  key_ops: z.array(z.string()).optional(),
  /** JWK "kid" (Key ID) Parameter. */
  kid: z.string().optional(),
  /** JWK "kty" (Key Type) Parameter.
   * This attribute is required to discriminate the
   * type of EC/RSA algorithm */
  kty: z.union([z.literal("RSA"), z.literal("EC")]),
  n: z.string().optional(),
  p: z.string().optional(),
  q: z.string().optional(),
  qi: z.string().optional(),
  /** JWK "use" (Public Key Use) Parameter. */
  use: z.string().optional(),
  x: z.string().optional(),
  y: z.string().optional(),
  /** JWK "x5c" (X.509 Certificate Chain) Parameter. */
  x5c: z.array(z.string()).optional(),
  /** JWK "x5t" (X.509 Certificate SHA-1 Thumbprint) Parameter. */
  x5t: z.string().optional(),
  /** "x5t#S256" (X.509 Certificate SHA-256 Thumbprint) Parameter. */
  "x5t#S256": z.string().optional(),
  /** JWK "x5u" (X.509 URL) Parameter. */
  x5u: z.string().optional(),
});
