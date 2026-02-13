import * as z from "zod";

export type NonceResponse = z.infer<typeof NonceResponse>;
export const NonceResponse = z.object({
  c_nonce: z.string(),
});
