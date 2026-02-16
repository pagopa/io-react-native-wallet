import { RelyingPartyResponseError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import type { RemotePresentationApi } from "../api";
import {
  PresentationParams,
  RequestObjectWalletCapabilities,
} from "../api/types";
import { InvalidQRCodeError } from "../common/errors";

export const getRequestObject: RemotePresentationApi["getRequestObject"] =
  async (
    authorizationRequestUrl,
    { appFetch = fetch, walletCapabilities } = {}
  ) => {
    const url = new URL(authorizationRequestUrl);

    const rawParams = {
      request_uri: url.searchParams.get("request_uri"),
      client_id: url.searchParams.get("client_id"),
      state: url.searchParams.get("state"),
      request_uri_method: url.searchParams.get("request_uri_method") as
        | "get"
        | "post",
    };

    const parsed = PresentationParams.safeParse({
      ...rawParams,
      request_uri_method: rawParams.request_uri_method ?? "get",
    });

    if (!parsed.success) {
      throw new InvalidQRCodeError(parsed.error.message);
    }

    const requestUri = parsed.data.request_uri;

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
