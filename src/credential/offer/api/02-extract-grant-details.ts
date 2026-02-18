import type { CredentialOffer, ExtractGrantDetailsResult } from "./types";

export interface ExtractGrantDetailsApi {
  /**
   * Extract grant details from a resolved Credential Offer.
   *
   * @param offer - A previously resolved {@link CredentialOffer}.
   * @returns The extracted {@link ExtractGrantDetailsResult} containing
   *   the grant type and its parameters.
   * @throws {InvalidCredentialOfferError} If no supported grant type is found.
   */
  extractGrantDetails(offer: CredentialOffer): ExtractGrantDetailsResult;
}
