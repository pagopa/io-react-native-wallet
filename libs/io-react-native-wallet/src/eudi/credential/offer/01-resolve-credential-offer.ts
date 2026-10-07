import {
  InvalidCredentialOfferError,
  InvalidQRCodeError,
} from "../../../credential/offer/common/errors";
import { hasStatusOrThrow } from "../../../utils/misc";
import { CredentialOffer } from "./types";

/**
 * Resolves an EUDI Wallet Credential Offer (OpenID4VCI 1.0, Section 4.1),
 * transmitted either by value (`credential_offer`) or by reference (`credential_offer_uri`).
 *
 * Any URI scheme is accepted, since EU wallets use different ones
 * (e.g. `openid-credential-offer://`, `haip-vci://`, `https://`).
 *
 * @param uri - The Credential Offer URI, scanned from a QR code or received as deep link
 * @param callbacks.fetch - (optional) The fetch implementation, defaults to the global one
 * @returns The validated {@link CredentialOffer}
 * @throws {InvalidQRCodeError} If the URI is malformed or does not carry a Credential Offer
 * @throws {UnexpectedStatusCodeError} If the Credential Offer by reference cannot be fetched
 * @throws {InvalidCredentialOfferError} If the Credential Offer is not valid
 */
export const resolveCredentialOffer = async (
  uri: string,
  callbacks: { fetch?: typeof fetch } = {},
): Promise<CredentialOffer> => {
  const { fetch: fetchFn = fetch } = callbacks;

  const searchParams = parseUri(uri);
  const offerByValue = searchParams.get("credential_offer");
  const offerUri = searchParams.get("credential_offer_uri");

  if (offerByValue && offerUri) {
    throw new InvalidQRCodeError(
      "The URI must contain either credential_offer or credential_offer_uri, not both",
    );
  }

  if (offerByValue) {
    return parseCredentialOffer(parseJson(offerByValue));
  }

  if (offerUri) {
    const offer = await fetchFn(offerUri, {
      headers: { Accept: "application/json" },
      method: "GET",
    })
      .then(hasStatusOrThrow(200))
      .then((res) => res.json());
    return parseCredentialOffer(offer);
  }

  throw new InvalidQRCodeError(
    "The URI must contain credential_offer or credential_offer_uri",
  );
};

const parseUri = (uri: string) => {
  try {
    return new URL(uri.trim()).searchParams;
  } catch {
    throw new InvalidQRCodeError(`Invalid credential offer URI: ${uri}`);
  }
};

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    throw new InvalidQRCodeError("The credential_offer is not a valid JSON");
  }
};

const parseCredentialOffer = (offer: unknown) => {
  const result = CredentialOffer.safeParse(offer);
  if (!result.success) {
    throw new InvalidCredentialOfferError(
      `Invalid credential offer: ${result.error.message}`,
    );
  }
  return result.data;
};
