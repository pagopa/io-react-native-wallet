import type { MRTDPoPApi } from "../api/mrtd-pop";
import { verifyAndParseChallengeInfo } from "./01-verify-and-parse-challenge-info";
import { initChallenge } from "./02-init-challenge";
import {
  validateChallenge,
  buildChallengeCallbackUrl,
} from "./03-validate-challenge";

export const MRTDPoP: MRTDPoPApi = {
  verifyAndParseChallengeInfo,
  initChallenge,
  validateChallenge,
  buildChallengeCallbackUrl,
};
