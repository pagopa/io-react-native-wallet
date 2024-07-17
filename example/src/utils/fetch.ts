import { WALLET_PROVIDER_AUTH_TOKEN, WALLET_PROVIDER_BASE_URL } from "@env";

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
  const requestUrl =
    typeof request === "string" ? new URL(request) : new URL(request.url);
  const authHeaders: AuthHeaders =
    requestUrl.origin === new URL(WALLET_PROVIDER_BASE_URL).origin
      ? {
          Authorization: `Bearer ${WALLET_PROVIDER_AUTH_TOKEN}`,
        }
      : {};

  return fetch(request, addAuthHeaders(options, authHeaders));
}
