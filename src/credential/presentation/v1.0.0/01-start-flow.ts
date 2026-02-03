import { InvalidQRCodeError } from "../common/errors";
import type { RemotePresentationApi } from "../api";
import { PresentationParams } from "../api/types";

export const startFlowFromQR: RemotePresentationApi["startFlowFromQR"] = (
  params
) => {
  const result = PresentationParams.safeParse({
    ...params,
    request_uri_method: params.request_uri_method ?? "get",
  });

  if (result.success) {
    return result.data;
  }

  throw new InvalidQRCodeError(result.error.message);
};
