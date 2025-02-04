import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";

export type GetRequestObject = (
  requestUri: Out<StartFlow>["requestUri"],
  context: {
    appFetch?: GlobalFetch["fetch"];
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
  { appFetch = fetch }
) => {
  const requestObjectEncodedJwt = await appFetch(requestUri, {
    method: "GET",
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.text());

  return {
    requestObjectEncodedJwt,
  };
};
