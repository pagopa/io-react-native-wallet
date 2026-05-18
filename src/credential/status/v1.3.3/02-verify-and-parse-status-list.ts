import { verify } from "@pagopa/io-react-native-jwt";
import { getListFromStatusListJWT } from "@sd-jwt/jwt-status-list";
import type { StatusListApi } from "../api/status-list";

/**
 * Mapping of status bits to their corresponding meaning as defined in the specification.
 * @see https://italia.github.io/eid-wallet-it-docs/releases/1.3.3/en/credential-revocation.html#token-status-lists
 */
const CredentialStatusMap = {
  0x00: "valid",
  0x01: "invalid",
  0x02: "suspended",
  0x03: "update",
  0x0b: "attribute_update",
} as const;

type CredentialStatusBit = keyof typeof CredentialStatusMap;

export const verifyAndParseStatusList: StatusListApi["verifyAndParse"] = async (
  keys,
  { statusList: rawStatusList, idx }
) => {
  await verify(rawStatusList, keys);

  const statusList = getListFromStatusListJWT(rawStatusList);
  const statusBit = statusList.getStatus(idx) as CredentialStatusBit;
  const status = CredentialStatusMap[statusBit];

  return { status, statusBit };
};
