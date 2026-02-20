import { InvalidQRCodeError } from "../common/errors";
import type { RemotePresentationApi } from "../api";
import { PresentationParams } from "../api/types";
import { validateAuthorizationRequestParams } from "@pagopa/io-wallet-oid4vp";

export const startFlowFromQR: RemotePresentationApi["startFlowFromQR"] = (
  params
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
