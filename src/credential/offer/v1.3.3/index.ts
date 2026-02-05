import type { OfferApi } from "../api";
import { startFlow } from "./01-start-flow";
import { fetchCredentialOffer } from "./02-fetch-credential-offer";
import { evaluateIssuerMetadataFromOffer } from "./03-evaluate-issuer-metadata";
import { selectGrantType } from "./04-select-grant-type";

export const Offer: OfferApi = {
  startFlow,
  fetchCredentialOffer,
  evaluateIssuerMetadataFromOffer,
  selectGrantType,
};
