import type { OfferApi } from "../api";

import { UnimplementedFeatureError } from "../../../utils/errors";

export const Offer: OfferApi = {
  extractGrantDetails() {
    throw new UnimplementedFeatureError("extractGrantDetails", "1.0.0");
  },
  async resolveCredentialOffer() {
    throw new UnimplementedFeatureError("resolveCredentialOffer", "1.0.0");
  },
  validateCredentialOffer() {
    throw new UnimplementedFeatureError("validateCredentialOffer", "1.0.0");
  },
};
