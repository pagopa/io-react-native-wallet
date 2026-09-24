import { decode as decodeJwt, verify } from "@pagopa/io-react-native-jwt";

import type { StatusListApi } from "../api/status-list";

import { StatusList } from "../api/types";

export const verifyAndParseStatusList: StatusListApi["verifyAndParse"] = async (
  keys,
  statusList,
) => {
  await verify(statusList, keys);
  return StatusList.parse(decodeJwt(statusList).payload);
};
