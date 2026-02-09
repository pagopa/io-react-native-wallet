import type { PresentationParams } from "./types";

type NullablePresentationParams = {
  [K in keyof PresentationParams]?: PresentationParams[K] | null;
};

export interface StartFlowApi {
  /**
   * Start a presentation flow by validating the required parameters.
   * Parameters are extracted from a url encoded in a QR code or in a deep link.
   * @since 1.0.0
   *
   * @param params The QR code parameters to be validated
   * @returns The validated presentation parameters
   * @throws {InvalidQRCodeError} if the provided parameters are not valid
   */
  startFlowFromQR(params: NullablePresentationParams): PresentationParams;
}
