import { sdkConfigV1_0, sdkConfigV1_3 } from "../../../utils/config";
import type { MRTDPoPApi } from "../api/mrtd-pop";
import { verifyAndParseChallengeInfo } from "./01-verify-and-parse-challenge-info";
import { createInitChallenge } from "./02-init-challenge";
import {
  createValidateChallenge,
  buildChallengeCallbackUrl,
} from "./03-validate-challenge";

export const MRTDPoPv1_0: MRTDPoPApi = {
  verifyAndParseChallengeInfo,
  initChallenge: createInitChallenge({ sdkConfig: sdkConfigV1_0 }),
  validateChallenge: createValidateChallenge({ sdkConfig: sdkConfigV1_0 }),
  buildChallengeCallbackUrl,
};

export const MRTDPoPv1_3: MRTDPoPApi = {
  verifyAndParseChallengeInfo,
  initChallenge: createInitChallenge({ sdkConfig: sdkConfigV1_3 }),
  validateChallenge: createValidateChallenge({ sdkConfig: sdkConfigV1_3 }),
  buildChallengeCallbackUrl,
};
