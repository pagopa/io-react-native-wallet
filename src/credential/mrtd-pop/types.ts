import * as z from "zod";

export type MrtdProofChallengeInfo = z.infer<typeof MrtdProofChallengeInfo>;
export const MrtdProofChallengeInfo = z.object({
  header: z.object({
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
  header: z.object({
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
