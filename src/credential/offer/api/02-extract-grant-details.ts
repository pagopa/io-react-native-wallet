import type {
  CredentialOffer,
  ExtractGrantDetailsResult,
} from "@pagopa/io-wallet-oid4vci";

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
