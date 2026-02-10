import type { StartFlowApi } from "./01-start-flow";
import type { FetchCredentialOfferApi } from "./02-fetch-credential-offer";
import type { EvaluateIssuerMetadataApi } from "./03-evaluate-issuer-metadata";
import type { SelectGrantTypeApi } from "./04-select-grant-type";

export interface OfferApi
  extends StartFlowApi,
    FetchCredentialOfferApi,
    EvaluateIssuerMetadataApi,
    SelectGrantTypeApi {}

export type * from "./types";
