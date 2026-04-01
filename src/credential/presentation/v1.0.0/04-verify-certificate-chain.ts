import { UnimplementedFeatureError } from "../../../utils/errors";
import { type RemotePresentationApi } from "../api";

export const verifyAuthRequestCertificateChain: RemotePresentationApi["verifyAuthRequestCertificateChain"] =
  async () => {
    throw new UnimplementedFeatureError(
      "verifyAuthRequestCertificateChain",
      "1.0.0",
    );
  };
