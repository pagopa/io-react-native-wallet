import type { CredentialOffer } from "../v1.3.3/types";

/**
 * Fetches and validates a credential offer from a given URI.
 *
 * This function performs an HTTP GET request to the specified `credentialOfferUri`,
 * expecting a JSON response that matches the `CredentialOfferSchema`. If the response
 * is invalid or does not conform to the schema, an error is logged and an
 * `InvalidCredentialOfferError` is thrown.
 *
 * @param uri - The URI from which to fetch the credential offer.
 * @param context - Optional context object that may provide a custom `appFetch` implementation.
 * @returns The validated credential offer data.
 * @throws {IssuerResponseError} If the HTTP response status is not 200.
 * @throws {InvalidCredentialOfferError} If the response does not match the expected schema.
 */
export interface FetchCredentialOfferApi {
  fetchCredentialOffer(
    credentialOfferUri: string,
    context: {
      appFetch?: GlobalFetch["fetch"];
    }
  ): Promise<CredentialOffer>;
}
