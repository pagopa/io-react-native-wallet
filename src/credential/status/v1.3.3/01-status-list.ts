import { CBOR } from "@pagopa/io-react-native-iso18013";
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
  format
) => {
  const { uri, idx } = await getStatusListEntry(credential, format);

  const statusList = await fetch(uri, {
    headers: {
      Accept: "application/statuslist+jwt",
    },
  })
    .then(hasStatusOrThrow(200))
    .then((response) => response.text());

  return { statusList, uri, idx, format: "jwt" };
};
