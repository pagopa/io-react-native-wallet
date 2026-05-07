import { verify } from "@pagopa/io-react-native-jwt";
import { getListFromStatusListJWT } from "@sd-jwt/jwt-status-list";
import {
  IssuerResponseError,
  IssuerResponseErrorCodes,
} from "../../../utils/errors";
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
  issuerConf,
  { statusList: rawStatusList, idx }
) => {
  await verify(rawStatusList, issuerConf.keys);

  const statusList = getListFromStatusListJWT(rawStatusList);
  const statusBit = statusList.getStatus(idx) as CredentialStatusBit;
  const status = CredentialStatusMap[statusBit];

  // Throwing IssuerResponseError for backward compatibility with 1.0 (status assertion)
  // After the status assertion is fully deprecated, a more specific error can be thrown
  // or the status can be returned as is.
  if (status === "invalid" || status === "suspended") {
    throw new IssuerResponseError({
      code: IssuerResponseErrorCodes.CredentialInvalidStatus,
      message: "Invalid status found for the given credential",
      statusCode: 200,
      reason: { error: status },
    });
  }

  return { status, statusBit };
};
