import type { ResolveCredentialOfferApi } from "./01-resolve-credential-offer";
import type { ExtractGrantDetailsApi } from "./02-extract-grant-details";

export interface OfferApi
  extends ResolveCredentialOfferApi,
    ExtractGrantDetailsApi {}

export type {
  CredentialOffer,
  ExtractGrantDetailsResult,
} from "@pagopa/io-wallet-oid4vci";
