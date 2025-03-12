import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { UnixTime } from "../../sd-jwt/types";
import * as z from "zod";

/**
 * A pair that associate a tokenized Verified Credential with the claims presented or requested to present.
 */
export type Presentation = [
  /* verified credential token */ string,
  /* claims */ string[],
  /* the context for the key associated to the credential */ CryptoContext
];

export type RequestObject = z.infer<typeof RequestObject>;
export const RequestObject = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string(),
  nonce: z.string(),
  response_uri: z.string(),
  response_type: z.literal("vp_token"),
  response_mode: z.literal("direct_post.jwt"),
  client_id: z.string(),
  dcql_query: z.record(z.string(), z.any()),
});
