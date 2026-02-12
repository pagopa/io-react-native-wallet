import { UnimplementedFeatureError } from "../../../utils/errors";
import { type TrustmarkApi as Api } from "../api";

export const getCredentialTrustmark: Api["getCredentialTrustmark"] =
  async () => {
    throw new UnimplementedFeatureError("getCredentialTrustmark", "1.3.3");
  };
