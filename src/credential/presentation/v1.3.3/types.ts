import * as z from "zod";
import { zOpenid4vpAuthorizationRequestPayload as sdkRequestObjectPayload } from "@pagopa/io-wallet-oid4vp";

export type RequestObjectPayload = z.infer<typeof sdkRequestObjectPayload>;
export const RequestObjectPayload = sdkRequestObjectPayload;

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string().optional(),
  response_code: z.string().optional(),
  redirect_uri: z.string().optional(),
});
