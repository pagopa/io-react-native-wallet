import { StatusList as JwtStatusList } from "@owf/token-status-list";
import { toUint8Array } from "js-base64";

import type { StatusListApi } from "../api/status-list";

import { IoWalletError } from "../../../utils/errors";

/**
 * Mapping of status values to their corresponding meaning as defined in the specification.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.4.6/en/credential-revocation.html#token-status-lists
 */
const CredentialStatusMap = {
  0x00: "valid",
  0x01: "invalid",
  0x02: "suspended",
  0x03: "update",
  0x0f: "attribute_update",
} as const;

type CredentialStatusValue = keyof typeof CredentialStatusMap;

const formatStatusValue = (statusValue: number) =>
  `0x${statusValue.toString(16).padStart(2, "0").toUpperCase()}`;

export const getStatus: StatusListApi["getStatus"] = (statusList, idx) => {
  const decodedStatusList = JwtStatusList.decompressStatusListFromBytes(
    toUint8Array(statusList.lst),
    statusList.bits,
    statusList.aggregation_uri,
  );
  const statusValue = decodedStatusList.getStatus(idx) as CredentialStatusValue;
  const status = CredentialStatusMap[statusValue];

  if (!status) {
    throw new IoWalletError(
      `Unsupported credential status value: ${formatStatusValue(statusValue)}`,
    );
  }

  return {
    rawStatus: formatStatusValue(statusValue),
    status,
  };
};
