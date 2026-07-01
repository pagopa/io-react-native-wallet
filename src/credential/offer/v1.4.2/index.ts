import type { OfferApi } from "../api";
import { resolveCredentialOffer } from "./01-resolve-credential-offer";
import { extractGrantDetails } from "./02-extract-grant-details";
import { validateCredentialOffer } from "./03-validate-credential-offer";

export const Offer: OfferApi = {
  resolveCredentialOffer,
  extractGrantDetails,
  validateCredentialOffer,
};
