import type { CredentialStatusApi } from "../api";

import {
  getStatusList,
  getStatusListByUri,
  getStatusListEntry,
} from "./01-status-list";
import { verifyAndParseStatusList } from "./02-verify-and-parse-status-list";
import { getStatus } from "./03-get-status";

export const CredentialStatus: CredentialStatusApi = {
  statusAssertion: {
    isSupported: false,
  },
  statusList: {
    get: getStatusList,
    getByUri: getStatusListByUri,
    getStatus,
    getStatusListEntry,
    isSupported: true,
    verifyAndParse: verifyAndParseStatusList,
  },
};
