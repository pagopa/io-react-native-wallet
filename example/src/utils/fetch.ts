import {
  IPZS_AUTH_TOKEN,
  WALLET_EAA_PROVIDER_BASE_URL,
  WALLET_PID_PROVIDER_BASE_URL,
  WALLET_PROVIDER_BASE_URL,
} from "@env";
import { selectIoAuthToken } from "../store/reducers/sesssion";
import { store } from "../store/store";

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
  const authToken = selectIoAuthToken(state);
  const requestUrl =
    typeof request === "string" ? new URL(request) : new URL(request.url);

  const authHeaders: AuthHeaders = (function () {
    switch (requestUrl.origin) {
      case new URL(WALLET_PROVIDER_BASE_URL).origin: {
        return {
          Authorization: `Bearer ${authToken}`,
        };
      }
      case new URL(WALLET_PID_PROVIDER_BASE_URL).origin: {
        return {
          AuthorizationIPZS: `${IPZS_AUTH_TOKEN}`,
        };
      }
      case new URL(WALLET_EAA_PROVIDER_BASE_URL).origin: {
        return {
          AuthorizationIPZS: `${IPZS_AUTH_TOKEN}`,
        };
      }
      default: {
        return {};
      }
    }
  })();

  return fetch(request, addAuthHeaders(options, authHeaders));
}
