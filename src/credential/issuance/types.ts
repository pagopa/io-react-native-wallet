import { AuthorizationDetail } from "../../utils/par";
import * as z from "zod";

export type TokenResponse = z.infer<typeof TokenResponse>;

export const TokenResponse = z.object({
  access_token: z.string(),
  authorization_details: z.array(AuthorizationDetail),
  c_nonce: z.string(),
  c_nonce_expires_in: z.number(),
  expires_in: z.number(),
  token_type: z.string(),
});
