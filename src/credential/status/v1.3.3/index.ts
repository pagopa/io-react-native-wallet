import type { CredentialStatusApi } from "../api";
import { getStatusList } from "./01-status-list";
import { verifyAndParseStatusList } from "./02-verify-and-parse-status-list";

export const CredentialStatus: CredentialStatusApi = {
  statusAssertion: {
    isSupported: false,
  },
  statusList: {
    isSupported: true,
    get: getStatusList,
    verifyAndParse: verifyAndParseStatusList,
  },
};
