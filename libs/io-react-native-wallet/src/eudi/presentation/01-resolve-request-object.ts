import {
  Oid4vpError,
  fetchAuthorizationRequest as sdkFetchAuthorizationRequest,
} from "@pagopa/io-wallet-oid4vp";
import { ValidationError as SdkValidationError } from "@pagopa/io-wallet-utils";
import { v4 as uuidv4 } from "uuid";

import { InvalidQRCodeError } from "../../credential/presentation/common/errors";
import { mapSdkFetchAuthRequestError } from "../../credential/presentation/v1.4.6/sdkErrorMapper";
import { WALLET_METADATA } from "./utils";

export interface ResolvedRequestObject {
  /** The `client_id` of the Authorization Request URI, which the Request Object must match */
  clientId: string;
  /** The signed Request Object */
  requestObjectJwt: string;
  /** The nonce sent to the Verifier when the Request Object is fetched with POST */
  walletNonce?: string;
}

/**
 * Resolves the Request Object of an OpenID4VP 1.0 Authorization Request (Section 5),
 * transmitted either by value (`request`) or by reference (`request_uri`, Section 5.10).
 * With `request_uri_method=post`, the wallet sends its metadata and a fresh `wallet_nonce`
 * (Section 5.10.1), which the Request Object must contain.
 *
 * The request is fetched with the IO Wallet SDK, whose fetch step does not depend on the
 * IT-Wallet profile. Any URI scheme is accepted, since EU verifiers use different ones
 * (e.g. `openid4vp://`, `haip-vp://`, `eudi-openid4vp://`, `https://`).
 *
 * @param uri - The Authorization Request URI, scanned from a QR code or received as deep link
 * @param callbacks.fetch - (optional) The fetch implementation, defaults to the global one
 * @returns The Request Object to verify with {@link verifyRequestObject}
 * @throws {InvalidQRCodeError} If the URI is malformed or does not carry a Request Object
 * @throws {RelyingPartyResponseError} If the Request Object by reference cannot be fetched
 */
export const resolveRequestObject = async (
  uri: string,
  callbacks: { fetch?: typeof fetch } = {},
): Promise<ResolvedRequestObject> => {
  const { fetch: fetchFn = fetch } = callbacks;
  const walletNonce = uuidv4();

  const { parsedQrCode, requestObjectJwt } = await sdkFetchAuthorizationRequest(
    {
      authorizeRequestUrl: uri.trim(),
      callbacks: { fetch: fetchFn },
      walletMetadata: WALLET_METADATA,
      walletNonce,
    },
  ).catch((e: unknown) => {
    if (e instanceof SdkValidationError || e instanceof Oid4vpError) {
      throw new InvalidQRCodeError(e.message);
    }
    return mapSdkFetchAuthRequestError(e);
  });

  return {
    clientId: parsedQrCode.clientId,
    requestObjectJwt,
    // The SDK sends the wallet nonce only when it fetches the Request Object with POST
    ...(parsedQrCode.requestUriMethod === "post" && { walletNonce }),
  };
};
