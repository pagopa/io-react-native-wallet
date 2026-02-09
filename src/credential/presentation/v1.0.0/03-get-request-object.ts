import { RelyingPartyResponseError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import type { RemotePresentationApi } from "../api";
import { RequestObjectWalletCapabilities } from "../api/types";

export const getRequestObject: RemotePresentationApi["getRequestObject"] =
  async (requestUri, { appFetch = fetch, walletCapabilities } = {}) => {
    if (walletCapabilities) {
      // Validate external input
      const { wallet_metadata, wallet_nonce } =
        RequestObjectWalletCapabilities.parse(walletCapabilities);

      const formUrlEncodedBody = new URLSearchParams({
        wallet_metadata: JSON.stringify(wallet_metadata),
        ...(wallet_nonce && { wallet_nonce }),
      });

      const requestObjectEncodedJwt = await appFetch(requestUri, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formUrlEncodedBody.toString(),
      })
        .then(hasStatusOrThrow(200, RelyingPartyResponseError))
        .then((res) => res.text());

      return {
        requestObjectEncodedJwt,
      };
    }

    const requestObjectEncodedJwt = await appFetch(requestUri, {
      method: "GET",
    })
      .then(hasStatusOrThrow(200, RelyingPartyResponseError))
      .then((res) => res.text());

    return {
      requestObjectEncodedJwt,
    };
  };
