import uuid from "react-native-uuid";
import {
  sha256ToBase64,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";

import { createDPopToken } from "../../utils/dpop";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";
import { RequestObjectWalletCapabilities } from "./types";

export type GetRequestObject = (
  requestUri: Out<StartFlow>["requestURI"],
  context: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
    walletInstanceAttestation: string;
    walletCapabilities?: RequestObjectWalletCapabilities;
  }
) => Promise<{ requestObjectEncodedJwt: string }>;

/**
 * Obtain the Request Object for RP authentication. Both the GET and POST `request_uri_method` are supported.
 * @see https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/relying-party-solution.html
 *
 * @param requestUri The url for the Relying Party to connect with
 * @param rpConf The Relying Party's configuration
 * @param context.wiaCryptoContext The context to access the key associated with the Wallet Instance Attestation
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.walletCapabilities (optional) An object containing the wallet technical capabilities
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Request Object that describes the presentation
 */
export const getRequestObject: GetRequestObject = async (
  requestUri,
  {
    wiaCryptoContext,
    appFetch = fetch,
    walletInstanceAttestation,
    walletCapabilities,
  }
) => {
  const signedWalletInstanceDPoP = await createDPopToken(
    {
      jti: `${uuid.v4()}`,
      htm: "GET",
      htu: requestUri,
      ath: await sha256ToBase64(walletInstanceAttestation),
    },
    wiaCryptoContext
  );

  const authorizationHeaders = {
    Authorization: `DPoP ${walletInstanceAttestation}`,
    DPoP: signedWalletInstanceDPoP,
  } as const;

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
        ...authorizationHeaders,
      },
      body: formUrlEncodedBody.toString(),
    })
      .then(hasStatusOrThrow(200))
      .then((res) => res.text());

    return {
      requestObjectEncodedJwt,
    };
  }

  const requestObjectEncodedJwt = await appFetch(requestUri, {
    method: "GET",
    headers: authorizationHeaders,
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());

  return {
    requestObjectEncodedJwt,
  };
};
