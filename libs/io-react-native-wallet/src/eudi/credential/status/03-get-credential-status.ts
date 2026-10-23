import { StatusList as TokenStatusList } from "@owf/token-status-list";
import { toUint8Array } from "js-base64";

import type { StatusList } from "../../../credential/status/api/types";
import type { CredentialStatus } from "./types";

/**
 * Status values defined by the IETF Token Status List (Section 7.1).
 * The other values are application specific or reserved, so their meaning is unknown.
 */
const STATUS_VALUES: Record<number, CredentialStatus["status"]> = {
  0x00: "VALID",
  0x01: "INVALID",
  0x02: "SUSPENDED",
};

/**
 * Reads the status of a credential from a verified Status List Token.
 *
 * @param statusList - The verified Status List Token payload
 * @param idx - The index of the credential in the Status List, from its `status.status_list.idx`
 * @returns The credential status and the raw status value in hexadecimal format (e.g. "0x01")
 */
export const getCredentialStatus = (
  statusList: StatusList,
  idx: number,
): CredentialStatus => {
  const { aggregation_uri, bits, lst } = statusList.status_list;
  const value = TokenStatusList.decompressStatusListFromBytes(
    toUint8Array(lst),
    bits,
    aggregation_uri,
  ).getStatus(idx);

  return {
    rawStatus: `0x${value.toString(16).padStart(2, "0").toUpperCase()}`,
    status: STATUS_VALUES[value] ?? "UNKNOWN",
  };
};
