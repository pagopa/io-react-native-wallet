import { ISSUER_AUTH_TOKEN, ISSUER_BASE_URL } from "@env";

function addAuthHeaders(
  options: RequestInit,
  authHeaders: Record<string, string>
) {
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
  let authHeaders: Record<string, string> = {};

  // Add the authentication header only if I am contacting the issuer URL
  if (requestUrl.origin === new URL(ISSUER_BASE_URL).origin) {
    authHeaders = {
      Authorization: `${ISSUER_AUTH_TOKEN}`,
    };
  }

  return fetch(request, addAuthHeaders(options, authHeaders));
}
