import { selectEnv } from "../store/reducers/environment";
import { selectIoAuthToken } from "../store/reducers/session";
import { store } from "../store/store";
import { getEnv } from "./environment";

interface AuthHeaders {
  Authorization?: string;
}

function addAuthHeaders(options: RequestInit, authHeaders: AuthHeaders) {
  return {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  };
}

export default function appFetch(request: RequestInfo, options: RequestInit) {
  const state = store.getState();
  const env = selectEnv(state);
  const { WALLET_PROVIDER_BASE_URL } = getEnv(env);
  const authToken = selectIoAuthToken(state);

  const requestUrl =
    typeof request === "string" ? new URL(request) : new URL(request.url);

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
}
