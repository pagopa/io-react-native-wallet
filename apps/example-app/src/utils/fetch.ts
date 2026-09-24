import type { RootState } from "../store/types";

import { selectEnv } from "../store/reducers/environment";
import { selectIoAuthToken } from "../store/reducers/session";
import { getEnv } from "./environment";

interface AuthHeaders {
  Authorization?: string;
}

let getState: (() => RootState) | undefined;

export const initAppFetch = (store: { getState: () => RootState }) => {
  getState = store.getState;
};

const appFetch: typeof fetch = (request, options = {}) => {
  if (!getState) {
    throw new Error("App fetch not initialized");
  }

  const state = getState();
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
    if (requestUrl.origin === new URL(WALLET_PROVIDER_BASE_URL).origin) {
      return {
        Authorization: `Bearer ${authToken}`,
      };
    } else {
      return {};
    }
  })();

  return fetch(request, addAuthHeaders(options, authHeaders));
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
