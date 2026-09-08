import { validateAuthorizationRequestParams } from "@pagopa/io-wallet-oid4vp";

import type { RemotePresentationApi } from "../api";

import { PresentationParams } from "../api/types";
import { InvalidQRCodeError } from "../common/errors";

export const startFlowFromQR: RemotePresentationApi["startFlowFromQR"] = (
  params,
) => {
  const nonNullParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== null),
  );
  const parsed = PresentationParams.safeParse({
    ...nonNullParams,
    request_uri_method: nonNullParams.request_uri_method ?? "get",
  });

  if (!parsed.success) {
    throw new InvalidQRCodeError(parsed.error.message);
  }

  try {
    return validateAuthorizationRequestParams(parsed.data);
  } catch (e) {
    throw new InvalidQRCodeError(e instanceof Error ? e.message : String(e));
  }
};
