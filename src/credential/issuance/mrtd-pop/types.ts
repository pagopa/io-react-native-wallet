import * as z from "zod";

export type MrtdProofChallengeInfo = z.infer<typeof MrtdProofChallengeInfo>;
export const MrtdProofChallengeInfo = z.object({
  protectedHeader: z.object({
    typ: z.literal("mrtd-ias+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
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
  }),
});

export type MrtdPoPChallenge = z.infer<typeof MrtdPoPChallenge>;
export const MrtdPoPChallenge = z.object({
  protectedHeader: z.object({
    typ: z.literal("mrtd-ias-pop+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: z.object({
    iss: z.string(),
    aud: z.string(),
    iat: z.number(),
    exp: z.number(),
    challenge: z.string(),
    mrtd_pop_nonce: z.string(),
    mrz: z.string().optional(),
    htu: z.string(),
    htm: z.literal("POST"),
  }),
});

export type MrtdPayload = {
  dg1: string;
  dg11: string;
  sod_mrtd: string;
};

export type IasPayload = {
  ias_pk: string;
  sod_ias: string;
  challenge_signed: string;
  nis: string;
};

export type MrtdPopVerificationResult = z.infer<
  typeof MrtdPopVerificationResult
>;
export const MrtdPopVerificationResult = z.object({
  status: z.literal("require_interaction"),
  type: z.literal("redirect_to_web"),
  mrtd_val_pop_nonce: z.string(),
  redirect_uri: z.string(),
});
