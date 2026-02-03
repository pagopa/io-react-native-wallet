import type { PresentationParams } from "./types";

export interface StartFlowApi {
  /**
   * Start a presentation flow by validating the required parameters.
   * Parameters are extracted from a url encoded in a QR code or in a deep link.
   * @since 1.0.0
   *
   * @param params The parameters to be validated
   * @returns The url for the Relying Party to connect with
   * @throws If the provided parameters are not valid
   */
  startFlowFromQR(params: Partial<PresentationParams>): PresentationParams;
}
