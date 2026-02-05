import { UnimplementedFeatureError } from "../../../utils/errors";
import type { CredentialStatusApi } from "../api";
import { getStatusAssertion } from "./01-status-assertion";
import { verifyAndParseStatusAssertion } from "./02-verify-and-parse-status-assertion";

export const CredentialStatus: CredentialStatusApi = {
  getStatusAssertion,
  verifyAndParseStatusAssertion,
  getStatusFromTokenStatusList() {
    throw new UnimplementedFeatureError(
      "getStatusFromTokenStatusList",
      "1.0.0"
    );
  },
};
