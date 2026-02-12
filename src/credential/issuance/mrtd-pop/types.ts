import * as z from "zod";
import {
  MrtdPoPChallenge,
  MrtdProofChallengeInfo,
} from "../api/mrtd-pop/types";

export const MrtdProofChallengeInfoJwt = z.object({
  protectedHeader: z.object({
    typ: z.literal("mrtd-ias+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: MrtdProofChallengeInfo,
});

export const MrtdPoPChallengeJwt = z.object({
  protectedHeader: z.object({
    typ: z.literal("mrtd-ias-pop+jwt"),
    alg: z.string(),
    kid: z.string(),
  }),
  payload: MrtdPoPChallenge,
});
