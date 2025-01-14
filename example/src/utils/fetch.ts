import { WALLET_PROVIDER_BASE_URL } from "@env";
import { selectSesssionId } from "../store/reducers/sesssion";
import { store } from "../store/store";

interface AuthHeaders {
  "x-user-id"?: string;
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
  const sessionId = selectSesssionId(state);

  const requestUrl =
    typeof request === "string" ? new URL(request) : new URL(request.url);

  const authHeaders: AuthHeaders = (function () {
    if (requestUrl.origin === new URL(WALLET_PROVIDER_BASE_URL).origin) {
      return {
        "x-user-id": sessionId,
      };
    } else {
      return {};
    }
  })();

  return fetch(request, addAuthHeaders(options, authHeaders));
}
