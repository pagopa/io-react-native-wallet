import * as z from "zod";
import { UnixTime } from "../../../utils/zod";

export type RequestObjectPayload = z.infer<typeof RequestObjectPayload>;
export const RequestObjectPayload = z.object({
  iss: z.string(),
  iat: UnixTime,
  exp: UnixTime,
  state: z.string().optional(),
  nonce: z.string(),
  response_uri: z.string(),
  request_uri_method: z.string().optional(),
  response_type: z.literal("vp_token"),
  response_mode: z.literal("direct_post.jwt"),
  client_id: z.string(),
  dcql_query: z.record(z.string(), z.any()), // Validation happens within the `dcql` library, no need to duplicate it here
  scope: z.string().optional(),
});
