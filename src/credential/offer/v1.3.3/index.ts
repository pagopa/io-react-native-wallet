import type { OfferApi } from "../api";
import { resolveCredentialOffer } from "./01-resolve-credential-offer";
import { extractGrantDetails } from "./02-extract-grant-details";

export const Offer: OfferApi = {
  resolveCredentialOffer,
  extractGrantDetails,
};
