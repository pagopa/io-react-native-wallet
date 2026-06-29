import { StatusList as JwtStatusList } from "@sd-jwt/jwt-status-list";
import { IoWalletError } from "../../../utils/errors";
import type { StatusListApi } from "../api/status-list";

/**
 * Mapping of status bits to their corresponding meaning as defined in the specification.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/credential-revocation.html#token-status-lists
 */
const CredentialStatusMap = {
  0x00: "VALID",
  0x01: "INVALID",
  0x02: "SUSPENDED",
  0x03: "UPDATE",
  0x0b: "ATTRIBUTE_UPDATE",
} as const;

type CredentialStatusBit = keyof typeof CredentialStatusMap;

const formatStatusBit = (statusBit: number) =>
  `0x${statusBit.toString(16).padStart(2, "0").toUpperCase()}`;

export const getStatus: StatusListApi["getStatus"] = (statusList, idx) => {
  const decodedStatusList = JwtStatusList.decompressStatusList(
    statusList.lst,
    statusList.bits
  );
  const statusBit = decodedStatusList.getStatus(idx) as CredentialStatusBit;
  const status = CredentialStatusMap[statusBit];

  if (!status) {
    throw new IoWalletError(
      `Unsupported credential status bit: ${formatStatusBit(statusBit)}`
    );
  }

  return {
    status,
    rawStatus: formatStatusBit(statusBit),
  };
};
