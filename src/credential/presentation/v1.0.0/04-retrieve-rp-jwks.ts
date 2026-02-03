import { UnimplementedFeatureError } from "../../../utils/errors";
import type { RemotePresentationApi } from "../api";

export const getJwksFromRpConfig: RemotePresentationApi["getJwksFromRpConfig"] =
  (rpConfig) => {
    const jwks = rpConfig.keys;

    if (!jwks || !Array.isArray(jwks.keys)) {
      throw new Error("JWKS not found in Relying Party configuration.");
    }

    return { keys: jwks };
  };

export const getJwksFromRequestObject: RemotePresentationApi["getJwksFromRequestObject"] =
  () => {
    throw new UnimplementedFeatureError("getJwksFromRequestObject", "1.0.0");
  };
