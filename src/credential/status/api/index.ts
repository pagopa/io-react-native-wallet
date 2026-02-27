import type { StatusAssertionApi } from "./status-assertion";
import type { StatusListApi } from "./status-list";

interface UnsupportedApi {
  isSupported: false;
}

/**
 * Credential status API. It supports status assertion and status list.
 *
 * **Important:** before using one or the other, ensure it is supported by the selected IT-Wallet version.
 *
 * @example
 * if (CredentialStatus.statusList.isSupported) {
 *   const statusList = await CredentialStatus.statusList.get()
 * }
 */
export interface CredentialStatusApi {
  statusAssertion: StatusAssertionApi | UnsupportedApi;
  statusList: StatusListApi | UnsupportedApi;
}

export * from "./types";
