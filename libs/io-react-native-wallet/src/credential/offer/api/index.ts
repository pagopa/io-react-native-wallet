import type { ResolveCredentialOfferApi } from "./01-resolve-credential-offer";
import type { ExtractGrantDetailsApi } from "./02-extract-grant-details";
import type { ValidateCredentialOfferApi } from "./03-validate-credential-offer";

export interface OfferApi
  extends ExtractGrantDetailsApi,
    ResolveCredentialOfferApi,
    ValidateCredentialOfferApi {}

export * from "./types";
