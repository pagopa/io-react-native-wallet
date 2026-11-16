import type { ResolveCredentialOfferApi } from "./01-resolve-credential-offer";
import type { ExtractGrantDetailsApi } from "./02-extract-grant-details";
import type { ValidateCredentialOfferApi } from "./03-validate-credential-offer";

/**
 * Credential Offer API.
 *
 * **Important:** before using it, ensure it is supported by the selected IT-Wallet version.
 *
 * @example
 * if (wallet.CredentialsOffer.isSupported) {
 *   const offer = await wallet.CredentialsOffer.resolveCredentialOffer(uri);
 * }
 */
export type OfferApi = OfferSupportedApi | UnsupportedApi;

export interface OfferSupportedApi
  extends ExtractGrantDetailsApi,
    ResolveCredentialOfferApi,
    ValidateCredentialOfferApi {
  isSupported: true;
}

interface UnsupportedApi {
  isSupported: false;
}

export * from "./types";
