import * as z from "zod";

export type AuthorizationDetail = z.infer<typeof AuthorizationDetail>;
export const AuthorizationDetail = z.union([
  z.object({
    credential_configuration_id: z.string(),
    type: z.literal("openid_credential"),
  }),
  z.object({
    challenge_method: z.literal("mrtd+ias"),
    challenge_redirect_uri: z.string(),
    idphinting: z.string(),
    type: z.literal("it_l2+document_proof"),
  }),
]);

export type AuthorizationDetails = z.infer<typeof AuthorizationDetails>;
export const AuthorizationDetails = z.array(AuthorizationDetail);
