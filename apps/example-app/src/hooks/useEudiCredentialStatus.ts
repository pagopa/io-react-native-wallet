import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import { useEffect, useState } from "react";

/**
 * Last checked status by Token Status List entry, so that the card of the next screen
 * immediately shows the same status, e.g. during the shared element transition.
 */
const checkedStatuses = new Map<
  string,
  Eudi.CredentialStatus.CredentialStatus
>();

/**
 * Checks the revocation status of an EUDI credential with its Token Status List entry.
 * @param entry - The Token Status List entry of the parsed credential, if any
 * @returns The credential status, the last checked one while checking, and the checking error
 */
export const useEudiCredentialStatus = (entry?: {
  idx: number;
  uri: string;
}) => {
  const idx = entry?.idx;
  const uri = entry?.uri;
  const key = entry && `${entry.idx}@${entry.uri}`;
  const [status, setStatus] = useState(() =>
    key ? checkedStatuses.get(key) : undefined,
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (idx === undefined || !uri || !key) return;
    setStatus(checkedStatuses.get(key));
    Eudi.CredentialStatus.fetchStatusList(uri)
      .then((statusListJwt) =>
        Eudi.CredentialStatus.verifyStatusList(statusListJwt, uri),
      )
      .then((statusList) => {
        const result = Eudi.CredentialStatus.getCredentialStatus(
          statusList,
          idx,
        );
        checkedStatuses.set(key, result);
        setStatus(result);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [idx, key, uri]);

  return { error, status };
};
