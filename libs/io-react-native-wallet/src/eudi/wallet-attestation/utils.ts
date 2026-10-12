import { validateWalletProviderResponse } from "../../client";
import { parseRawHttpResponse } from "../../utils/misc";

/**
 * Send a request to an endpoint of the EUDI Wallet Provider, which the IT-Wallet generated client
 * does not define. A string body is sent as `text/plain`, any other body as JSON.
 * @returns The body of the response, parsed as JSON when possible
 * @throws {WalletProviderResponseError} If the response status is not successful
 */
export const postToWalletProvider = (
  walletProviderBaseUrl: string,
  path: string,
  body: object | string,
  appFetch: typeof fetch,
): Promise<unknown> =>
  appFetch(`${walletProviderBaseUrl}${path}`, {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type":
        typeof body === "string" ? "text/plain" : "application/json",
    },
    method: "POST",
  })
    .then(validateWalletProviderResponse)
    .then<unknown>(parseRawHttpResponse);
