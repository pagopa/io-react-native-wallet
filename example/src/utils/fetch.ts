import { ISSUER_AUTH_TOKEN, ISSUER_BASE_URL } from "@env";

type AuthHeaders = Record<string, string>;

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
    requestUrl.origin === new URL(ISSUER_BASE_URL).origin
      ? { Authorization: `${ISSUER_AUTH_TOKEN}` }
      : {};

  return fetch(request, addAuthHeaders(options, authHeaders));
}
