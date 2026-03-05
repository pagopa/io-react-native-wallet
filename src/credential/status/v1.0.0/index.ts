import type { CredentialStatusApi } from "../api";
import { getStatusAssertion } from "./01-status-assertion";
import { verifyAndParseStatusAssertion } from "./02-verify-and-parse-status-assertion";

export const CredentialStatus: CredentialStatusApi = {
  statusAssertion: {
    isSupported: true,
    get: getStatusAssertion,
    verifyAndParse: verifyAndParseStatusAssertion,
  },
  statusList: {
    isSupported: false,
  },
};
