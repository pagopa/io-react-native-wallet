import type { ValidateCredentialOfferOptions } from "@pagopa/io-wallet-oid4vci";
import type { CredentialOffer } from "./types";

export interface ValidateCredentialOfferApi {
  /**
   * Validate a resolved Credential Offer against the Credential Issuer metadata.
   *
   * @param options.offer - A previously resolved Credential Offer.
   * @param options.credentialIssuerMetadata - The Credential Issuer metadata used
   *   to cross-check the offer (e.g. the `authorization_server` selected by the
   *   offer against the advertised `authorization_servers`).
   * @returns A promise that resolves when the Credential Offer is valid.
   * @throws {InvalidCredentialOfferError} If the Credential Offer fails validation.
   */
  validateCredentialOffer(options: {
    offer: CredentialOffer;
    credentialIssuerMetadata: ValidateCredentialOfferOptions["credentialIssuerMetadata"];
  }): Promise<void>;
}
