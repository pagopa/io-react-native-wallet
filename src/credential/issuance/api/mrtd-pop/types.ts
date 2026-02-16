import * as z from "zod";

export type MrtdPayload = {
  dg1: string;
  dg11: string;
  sod_mrtd: string;
};

export type IasPayload = {
  ias_pk: string;
  sod_ias: string;
  challenge_signed: string;
};

export type MrtdProofChallengeInfo = z.infer<typeof MrtdProofChallengeInfo>;
export const MrtdProofChallengeInfo = z.object({
  iss: z.string(),
  aud: z.string(),
  iat: z.number(),
  exp: z.number(),
  status: z.literal("require_interaction"),
  type: z.literal("mrtd+ias"),
  mrtd_auth_session: z.string(),
  state: z.string(),
  mrtd_pop_jwt_nonce: z.string(),
  htu: z.string(),
  htm: z.literal("POST"),
});

export type MrtdPoPChallenge = {
  challenge: string;
  mrtd_pop_nonce: string;
  pop_verify_endpoint: string;
  mrz?: string;
};

export type MrtdPopVerificationResult = {
  mrtd_val_pop_nonce: string;
  redirect_uri: string;
};
