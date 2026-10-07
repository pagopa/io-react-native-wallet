import { Alert } from "react-native";

import type { AppDispatch, RootState } from "../store/types";

import { selectEnv } from "../store/reducers/environment";
import { selectIoAuthToken, sessionReset } from "../store/reducers/session";
import { getEnv } from "./environment";

interface AppStore {
  dispatch: AppDispatch;
  getState: () => RootState;
}

interface AuthHeaders {
  Authorization?: string;
}

let appStore: AppStore | undefined;

export const initAppFetch = (store: AppStore) => {
  appStore = store;
};

/**
 * Logs the user out when the IO backend rejects the session token, like IO does.
 * This happens when the user logs in on another device or app, which invalidates the current session.
 */
const handleSessionExpired = (store: AppStore, expiredToken: string) => {
  // Several requests might fail concurrently, logout only once
  if (selectIoAuthToken(store.getState()) !== expiredToken) return;
  store.dispatch(sessionReset());
  Alert.alert(
    "Session expired",
    "You logged in on another device or app. Please login again.",
  );
};

const appFetch: typeof fetch = async (request, options = {}) => {
  if (!appStore) {
    throw new Error("App fetch not initialized");
  }
  const store = appStore;

  const state = store.getState();
  const env = selectEnv(state);
  const { WALLET_PROVIDER_BASE_URL } = getEnv(env);
  const authToken = selectIoAuthToken(state);

  const requestUrl =
    typeof request === "string"
      ? new URL(request)
      : request instanceof URL
        ? request
        : new URL(request.url);

  const authHeaders: AuthHeaders = (function () {
    if (
      authToken &&
      requestUrl.origin === new URL(WALLET_PROVIDER_BASE_URL).origin
    ) {
      return {
        Authorization: `Bearer ${authToken}`,
      };
    } else {
      return {};
    }
  })();

  const response = await fetch(request, addAuthHeaders(options, authHeaders));
  if (response.status === 401 && authHeaders.Authorization && authToken) {
    handleSessionExpired(store, authToken);
  }
  return response;
};

/**
 * Checks whether the current IO session is still valid.
 * An invalid session is handled by {@link appFetch}, which logs the user out.
 */
export const checkIoSession = async () => {
  if (!appStore) return;
  const state = appStore.getState();
  if (!selectIoAuthToken(state)) return;
  const { WALLET_PROVIDER_BASE_URL } = getEnv(selectEnv(state));
  await appFetch(
    new URL("/api/auth/v1/session", WALLET_PROVIDER_BASE_URL).href,
  );
};

export default appFetch;

function addAuthHeaders(options: RequestInit, authHeaders: AuthHeaders) {
  return {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  };
}
