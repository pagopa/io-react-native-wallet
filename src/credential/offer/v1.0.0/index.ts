import { UnimplementedFeatureError } from "../../../utils/errors";
import type { OfferApi } from "../api";

export const Offer: OfferApi = {
  async resolveCredentialOffer() {
    throw new UnimplementedFeatureError("resolveCredentialOffer", "1.0.0");
  },
  extractGrantDetails() {
    throw new UnimplementedFeatureError("extractGrantDetails", "1.0.0");
  },
};
