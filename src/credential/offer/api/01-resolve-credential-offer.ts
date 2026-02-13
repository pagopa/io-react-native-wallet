import type { CredentialOffer } from "./types";

export interface ResolveCredentialOfferApi {
  /**
   * Resolve and validate a Credential Offer received via QR code or deep link.
   *
   * Handles both transmission modes defined in OpenID4VCI Section 4.1:
   * - **by value** (`credential_offer`): the offer JSON is embedded in the URI.
   * - **by reference** (`credential_offer_uri`): the URI points to a resource
   *   that is fetched via HTTP GET.
   *
   * @param credentialOffer - The raw URI string from the QR code or deep link.
   * @param callbacks - Optional object with a custom `fetch` implementation
   *   used when the offer is transmitted by reference.
   * @returns The resolved and validated {@link CredentialOffer}.
   * @throws {InvalidQRCodeError} If the URI cannot be parsed or the offer cannot be fetched.
   * @throws {InvalidCredentialOfferError} If the resolved offer fails validation.
   */
  resolveCredentialOffer(
    credentialOffer: string,
    callbacks?: { fetch?: GlobalFetch["fetch"] }
  ): Promise<CredentialOffer>;
}
