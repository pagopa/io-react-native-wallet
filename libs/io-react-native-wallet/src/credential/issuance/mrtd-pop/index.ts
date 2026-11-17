import type { MRTDPoPApi } from "../api/mrtd-pop";

import { sdkConfigV1_4 } from "../../../utils/config";
import { verifyAndParseChallengeInfo } from "./01-verify-and-parse-challenge-info";
import { createInitChallenge } from "./02-init-challenge";
import {
  buildChallengeCallbackUrl,
  createValidateChallenge,
} from "./03-validate-challenge";

export const MRTDPoPv1_3: MRTDPoPApi = {
  buildChallengeCallbackUrl,
  initChallenge: createInitChallenge({ sdkConfig: sdkConfigV1_4 }),
  validateChallenge: createValidateChallenge({ sdkConfig: sdkConfigV1_4 }),
  verifyAndParseChallengeInfo,
};
