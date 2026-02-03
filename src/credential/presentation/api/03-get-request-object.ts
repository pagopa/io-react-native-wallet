import type { RequestObjectWalletCapabilities } from "./types";

export interface GetRequestObjectApi {
  /**
   * Obtain the Request Object for RP authentication. Both the GET and POST `request_uri_method` are supported.
   * @since 1.0.0
   *
   * @param requestUri The url for the Relying Party to connect with
   * @param context.walletCapabilities (optional) An object containing the wallet technical capabilities that will be sent with a POST request
   * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
   * @returns The Request Object that describes the presentation
   */
  getRequestObject(
    requestUri: string,
    context?: {
      appFetch?: GlobalFetch["fetch"];
      walletCapabilities?: RequestObjectWalletCapabilities;
    }
  ): Promise<{ requestObjectEncodedJwt: string }>;
}
