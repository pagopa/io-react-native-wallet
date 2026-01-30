import * as z from "zod";
import { UnixTime } from "../../utils/zod";
import { JWK } from "../../utils/jwk";

export const Jwt = z.object({
  header: z.object({
    alg: z.string(),
    kid: z.string(),
    typ: z.string(),
    x5c: z.array(z.string()).optional(),
    trust_chain: z.array(z.string()).optional(),
  }),
  payload: z.object({
    iss: z.string(),
    iat: UnixTime,
    exp: UnixTime,
    cnf: z.object({
      jwk: z.intersection(
        JWK,
        // this key requires a kid because it must be referenced for DPoP
        z.object({ kid: z.string() })
      ),
    }),
  }),
});
