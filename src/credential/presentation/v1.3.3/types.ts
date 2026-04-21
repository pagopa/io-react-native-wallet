import * as z from "zod";
import {
  zOpenid4vpAuthorizationRequestHeaderV1_3,
  zOpenid4vpAuthorizationRequestPayload,
} from "@pagopa/io-wallet-oid4vp";

export type RawRequestObject = z.infer<typeof RawRequestObject>;
export const RawRequestObject = z.object({
  header: zOpenid4vpAuthorizationRequestHeaderV1_3,
  payload: zOpenid4vpAuthorizationRequestPayload,
});

export type AuthorizationResponse = z.infer<typeof AuthorizationResponse>;
export const AuthorizationResponse = z.object({
  status: z.string().optional(),
  response_code: z.string().optional(),
  redirect_uri: z.string().optional(),
});
