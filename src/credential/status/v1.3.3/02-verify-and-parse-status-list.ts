import { verify } from "@pagopa/io-react-native-jwt";
import { getListFromStatusListJWT } from "@sd-jwt/jwt-status-list";
import type { StatusListApi } from "../api/status-list";

export const verifyAndParseStatusList: StatusListApi["verifyAndParse"] = async (
  issuerConf,
  { statusList: rawStatusList, idx }
) => {
  await verify(rawStatusList, issuerConf.keys);

  const statusList = getListFromStatusListJWT(rawStatusList);

  const status = statusList.getStatus(idx);

  // TODO: map the numeric status with meaningful values, throw CredentialInvalidStatus when invalid
  return {
    status,
  };
};
