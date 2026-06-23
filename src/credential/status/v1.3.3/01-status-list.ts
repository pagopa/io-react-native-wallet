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

const fetchStatusList = (
  uri: string,
  appFetch: GlobalFetch["fetch"],
  options: { cacheDisabled?: boolean } = {}
) =>
  appFetch(uri, {
    headers: {
      Accept: "application/statuslist+jwt",
      ...(options.cacheDisabled && { "Cache-Control": "no-cache" }),
    },
  })
    .then(hasStatusOrThrow(200))
    .then((response) => response.text());

export const getStatusListByUri: StatusListApi["getByUri"] = async (
  uri,
  { appFetch = fetch } = {}
) => {
  // When the HTTP response includes cache headers, fetch will return a cached response and the JWT might be expired
  let statusList = await fetchStatusList(uri, appFetch);
  const decoded = decodeJwt(statusList);

  const { exp } = decoded.payload;

  // If the status list JWT is expired, try to fetch it again bypassing the HTTP cache.
  // If it is still expired after the refetch, `verifyAndParseStatusList` will throw.
  if (exp && exp < Math.floor(Date.now() / 1000)) {
    statusList = await fetchStatusList(uri, appFetch, { cacheDisabled: true });
  }

  return statusList;
};

export const getStatusList: StatusListApi["get"] = async (
  credential,
  format,
  context
) => {
  const { uri, idx } = await getStatusListEntry(credential, format);
  const statusList = await getStatusListByUri(uri, context);
  return { uri, idx, statusList, format: "jwt" };
};
