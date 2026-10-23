import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import { useCallback, useEffect, useState } from "react";

/**
 * Last checked status by Token Status List entry, so that the card of the next screen
 * immediately shows the same status, e.g. the detail opened from the list.
 */
const checkedStatuses = new Map<
  string,
  Eudi.CredentialStatus.CredentialStatus
>();

/** Status checks of the mounted credentials, run again when the status lists are refreshed */
const statusChecks = new Set<() => Promise<void>>();

/**
 * Fetches again the Token Status Lists of every mounted credential and updates their status.
 * @returns A promise resolved when every status check is completed
 */
const refreshEudiStatusLists = async () => {
  await Promise.allSettled([...statusChecks].map((check) => check()));
};

/**
 * Pull to refresh of the Token Status Lists, which updates the status of every mounted credential.
 * @returns Whether the status lists are refreshing and the handler that refreshes them
 */
export const useEudiStatusListsRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshEudiStatusLists().finally(() => setRefreshing(false));
  }, []);
  return { onRefresh, refreshing };
};

/**
 * Checks the revocation status of an EUDI credential with its Token Status List entry.
 * The check runs again on {@link useEudiStatusListsRefresh} refresh, keeping the last status meanwhile.
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
    let mounted = true;
    const check = () =>
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
          if (!mounted) return;
          setStatus(result);
          setError(undefined);
        })
        .catch((e: unknown) => {
          if (mounted) setError(String(e));
        });
    setStatus(checkedStatuses.get(key));
    check();
    statusChecks.add(check);
    return () => {
      mounted = false;
      statusChecks.delete(check);
    };
  }, [idx, key, uri]);

  return { error, status };
};
