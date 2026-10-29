import type { OfferApi } from "../api";

import { Offer as V1_4_6 } from "../v1.4.6";
import { resolveCredentialOffer } from "./01-resolve-credential-offer";
import { extractGrantDetails } from "./02-extract-grant-details";
import { validateCredentialOffer } from "./03-validate-credential-offer";

export const Offer: OfferApi = {
  ...V1_4_6,
  extractGrantDetails,
  resolveCredentialOffer,
  validateCredentialOffer,
};
