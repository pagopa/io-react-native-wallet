import type { RemotePresentationApi } from "../api";
import { RequestObjectWalletCapabilities } from "../api/types";
import { fetchAuthorizationRequest as sdkFetchAuthorizationRequest } from "@pagopa/io-wallet-oid4vp";
import { mapSdkFetchAuthRequestError } from "./sdkErrorMapper";

export const getRequestObject: RemotePresentationApi["getRequestObject"] =
  async (
    authorizationRequestUrl,
    { appFetch = fetch, walletCapabilities } = {}
  ) => {
    const walletParams = walletCapabilities
      ? (() => {
          const { wallet_metadata, wallet_nonce } =
            RequestObjectWalletCapabilities.parse(walletCapabilities);
          return { walletMetadata: wallet_metadata, walletNonce: wallet_nonce };
        })()
      : {};

    const result = await sdkFetchAuthorizationRequest({
      authorizeRequestUrl: authorizationRequestUrl,
      callbacks: { fetch: appFetch },
      ...walletParams,
    }).catch(mapSdkFetchAuthRequestError);

    return {
      requestObjectEncodedJwt: result.requestObjectJwt,
    };
  };
