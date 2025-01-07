import uuid from "react-native-uuid";
import {
  decode as decodeJwt,
  sha256ToBase64,
  verify,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";

import { createDPopToken } from "../../utils/dpop";
import { NoSuitableKeysFoundInEntityConfiguration } from "./errors";
import type { FetchJwks } from "./03-retrieve-jwks";
import { hasStatusOrThrow, type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";
import { RequestObject } from "./types";

export type GetRequestObject = (
  requestUri: Out<StartFlow>["requestURI"],
  context: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
    walletInstanceAttestation: string;
  },
  jwkKeys?: Out<FetchJwks>["keys"]
) => Promise<{ requestObject: RequestObject }>;

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
  { wiaCryptoContext, appFetch = fetch, walletInstanceAttestation },
  jwkKeys
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

  const responseEncodedJwt = await appFetch(requestUri, {
    method: "GET",
    headers: {
      Authorization: `DPoP ${walletInstanceAttestation}`,
      DPoP: signedWalletInstanceDPoP,
    },
  })
    .then(hasStatusOrThrow(200))
    .then((res) => res.json())
    .then((responseJson) => responseJson.response);

  const responseJwt = decodeJwt(responseEncodedJwt);

  await verifyTokenSignature(jwkKeys, responseJwt);

  // Ensure that the request object conforms to the expected specification.
  const requestObject = RequestObject.parse(responseJwt.payload);

  return {
    requestObject,
  };
};

const verifyTokenSignature = async (
  jwkKeys?: Out<FetchJwks>["keys"],
  responseJwt?: any
): Promise<void> => {
  // verify token signature to ensure the request object is authentic
  // 1. according to entity configuration if present
  if (jwkKeys) {
    const pubKey = jwkKeys.find(
      ({ kid }) => kid === responseJwt.protectedHeader.kid
    );
    if (!pubKey) {
      throw new NoSuitableKeysFoundInEntityConfiguration(
        "Request Object signature verification"
      );
    }
    await verify(responseJwt, pubKey);
    return;
  }

  // 2. If jwk is not retrieved from entity config, check if the token contains the 'jwk' attribute
  if (responseJwt.protectedHeader?.jwk) {
    const pubKey = responseJwt.protectedHeader.jwk;
    await verify(responseJwt, pubKey);
    return;
  }

  // No verification condition matched: skipping signature verification.
};
