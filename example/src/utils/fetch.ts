import { ISSUER_AUTH_TOKEN, ISSUER_BASE_URL } from "@env";

const issuerBaseUrl = new URL(ISSUER_BASE_URL);
const issuerAuthToken = ISSUER_AUTH_TOKEN;

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
  if (requestUrl.origin === issuerBaseUrl.origin) {
    authHeaders = {
      Authorization: `${issuerAuthToken}`,
    };
  }

  return fetch(request, addAuthHeaders(options, authHeaders));
}
