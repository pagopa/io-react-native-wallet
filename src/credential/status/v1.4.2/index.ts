import type { CredentialStatusApi } from "../api";
import { getStatusList, getStatusListByUri } from "./01-status-list";
import { verifyAndParseStatusList } from "./02-verify-and-parse-status-list";
import { getStatus } from "./03-get-status";

export const CredentialStatus: CredentialStatusApi = {
  statusAssertion: {
    isSupported: false,
  },
  statusList: {
    isSupported: true,
    get: getStatusList,
    getByUri: getStatusListByUri,
    verifyAndParse: verifyAndParseStatusList,
    getStatus,
  },
};
