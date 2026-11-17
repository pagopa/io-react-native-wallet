import type { StatusListApi } from "./status-list";

/**
 * Credential status API, based on the Token Status List.
 *
 * @example
 * const { statusList: statusListJwt, idx } = await CredentialStatus.statusList.get(credential, format)
 * const statusList = await CredentialStatus.statusList.verifyAndParse(keys, statusListJwt)
 * const status = CredentialStatus.statusList.getStatus(statusList, idx)
 */
export interface CredentialStatusApi {
  statusList: StatusListApi;
}

export * from "./types";
