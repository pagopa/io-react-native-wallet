import uuid from "react-native-uuid";
import {
  sha256ToBase64,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";

import { createDPopToken } from "../../utils/dpop";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";

export type GetRequestObject = (
  requestUri: Out<StartFlow>["requestURI"],
  context: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
    walletInstanceAttestation: string;
  }
) => Promise<{ requestObjectEncodedJwt: string }>;

/**
 * Obtain the Request Object for RP authentication
 * @see https://italia.github.io/eudi-wallet-it-docs/versione-corrente/en/relying-party-solution.html
 *
 * @param requestUri The url for the Relying Party to connect with
 * @param rpConf The Relying Party's configuration
 * @param context.wiaCryptoContext The context to access the key associated with the Wallet Instance Attestation
 * @param context.walletInstanceAttestation The Wallet Instance Attestation token
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The Request Object that describes the presentation
 */
export const getRequestObject: GetRequestObject = async (
  requestUri,
  { wiaCryptoContext, appFetch = fetch, walletInstanceAttestation }
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

  const requestObjectEncodedJwt = await appFetch(requestUri, {
    method: "GET",
    headers: {
      Authorization: `DPoP ${walletInstanceAttestation}`,
      DPoP: signedWalletInstanceDPoP,
    },
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());

  return {
    requestObjectEncodedJwt,
  };
};
