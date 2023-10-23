import uuid from "react-native-uuid";
import {
  decode as decodeJwt,
  sha256ToBase64,
  verify,
  type CryptoContext,
} from "@pagopa/io-react-native-jwt";

import { createDPopToken } from "../../utils/dpop";
import { NoSuitableKeysFoundInEntityConfiguration } from "../../utils/errors";
import type { EvaluateRelyingPartyTrust } from "./02-evaluate-rp-trust";
import { hasStatus, type Out } from "../../utils/misc";
import type { StartFlow } from "./01-start-flow";
import { RequestObject } from "./types";

export type GetRequestObject = (
  requestUri: Out<StartFlow>["requestURI"],
  rpConf: Out<EvaluateRelyingPartyTrust>["rpConf"],
  context: {
    wiaCryptoContext: CryptoContext;
    appFetch?: GlobalFetch["fetch"];
    walletInstanceAttestation: string;
  }
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
  rpConf,
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

  const responseEncodedJwt = await appFetch(requestUri, {
    method: "GET",
    headers: {
      Authorization: `DPoP ${walletInstanceAttestation}`,
      DPoP: signedWalletInstanceDPoP,
    },
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((responseJson) => responseJson.response);

  const responseJwt = decodeJwt(responseEncodedJwt);

  // verify token signature according to RP's entity configuration
  // to ensure the request object is authentic
  {
    const pubKey = rpConf.wallet_relying_party.jwks.keys.find(
      ({ kid }) => kid === responseJwt.protectedHeader.kid
    );
    if (!pubKey) {
      throw new NoSuitableKeysFoundInEntityConfiguration(
        "Request Object signature verification"
      );
    }
    await verify(responseEncodedJwt, pubKey);
  }

  // parse request object it has the expected shape by specification
  const requestObject = RequestObject.parse(responseJwt.payload);

  return {
    requestObject,
  };
};
