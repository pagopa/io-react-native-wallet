import { validateAuthorizationRequestParams } from "@pagopa/io-wallet-oid4vp";

import type { RemotePresentationApi } from "../api";

import { PresentationParams } from "../api/types";
import { InvalidQRCodeError } from "../common/errors";

export const startFlowFromQR: RemotePresentationApi["startFlowFromQR"] = (
  params,
) => {
  const parsed = PresentationParams.safeParse(params);

  if (!parsed.success) {
    throw new InvalidQRCodeError(parsed.error.message);
  }

  try {
    const validatedParams = validateAuthorizationRequestParams(parsed.data);

    return validatedParams;
  } catch (e) {
    throw new InvalidQRCodeError(e instanceof Error ? e.message : String(e));
  }
};
