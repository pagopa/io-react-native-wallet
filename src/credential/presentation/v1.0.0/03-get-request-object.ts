import { RelyingPartyResponseError } from "../../../utils/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import type { RemotePresentationApi } from "../api";
import { RequestObjectWalletCapabilities } from "../api/types";
import { InvalidQRCodeError } from "../common/errors";

export const getRequestObject: RemotePresentationApi["getRequestObject"] =
  async (
    authorizationRequestUrl,
    { appFetch = fetch, walletCapabilities } = {}
  ) => {
    const authorizationUrl = new URL(authorizationRequestUrl);

    /*
     * The QR code parameters are validated in step 1.
     * For consistency with the 1.3 flow we accept the full authorization URL,
     * but here we only extract the `request_uri` to retrieve the Request Object.
     */
    const requestUri =
      authorizationUrl.searchParams.get("request_uri") ?? undefined;
    if (!requestUri) {
      throw new InvalidQRCodeError(
        "The QR code is missing the required 'request_uri' parameter."
      );
    }

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
