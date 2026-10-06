import * as z from "zod";

import { JWK } from "../../utils/jwk";
import { UnixTime } from "../../utils/zod";

export const Jwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    trust_chain: z.array(z.string()).optional(),
    typ: z.string(),
    x5c: z.array(z.string()).optional(),
  }),
  payload: z.object({
    cnf: z.object({
      jwk: z.intersection(
        JWK,
        // this key requires a kid because it must be referenced for DPoP
        z.object({ kid: z.string() }),
      ),
    }),
    exp: UnixTime,
    iat: UnixTime,
    iss: z.string(),
  }),
});
