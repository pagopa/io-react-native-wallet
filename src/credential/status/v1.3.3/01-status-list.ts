import { CBOR } from "@pagopa/io-react-native-iso18013";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import {
  getStatusListFromJWT,
  type StatusListEntry,
} from "@sd-jwt/jwt-status-list";
import { IoWalletError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import type { CredentialFormat } from "../../../credential/issuance/api";
import type { StatusListApi } from "../api/status-list";

const getStatusListEntry = async (
  credential: string,
  format: CredentialFormat
): Promise<StatusListEntry> => {
  let statusListEntry: StatusListEntry | undefined;

  if (format === "mso_mdoc") {
    // TODO: improve typing
    const decoded = await CBOR.decode(credential);
    statusListEntry = decoded.issuerAuth?.payload?.status?.status_list;
  }

  if (format === "dc+sd-jwt") {
    statusListEntry = getStatusListFromJWT(credential);
  }

  if (!statusListEntry) {
    throw new IoWalletError("Status list reference not found in credential");
  }

  return statusListEntry;
};

export const getStatusList: StatusListApi["get"] = async (
  credential,
  format,
  { appFetch = fetch } = {}
) => {
  const { uri, idx } = await getStatusListEntry(credential, format);

  const fetchStatusList = (options: { cacheDisabled?: boolean } = {}) =>
    appFetch(uri, {
      headers: {
        Accept: "application/statuslist+jwt",
        ...(options.cacheDisabled && { "Cache-Control": "no-cache" }),
      },
    })
      .then(hasStatusOrThrow(200))
      .then((response) => response.text());

  // When the HTTP response includes cache headers, fetch will return a cached response and the JWT might be expired
  let statusList = await fetchStatusList();
  const decoded = decodeJwt(statusList);

  const expirationDate = decoded.payload.exp
    ? new Date(decoded.payload.exp * 1000)
    : undefined;

  // If the status list JWT is expired, try to fetch it again bypassing the HTTP cache.
  // If it is still expired after the refetch, `verifyAndParseStatusList` will throw.
  if (expirationDate && expirationDate < new Date()) {
    statusList = await fetchStatusList({ cacheDisabled: true });
  }
  return { statusList, uri, idx, format: "jwt" };
};
