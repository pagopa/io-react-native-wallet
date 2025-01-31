import * as z from "zod";
import { ValidationFailed } from "../../utils/errors";

const PresentationParams = z.object({
  clientId: z.string().nonempty(),
  requestUri: z.string().url(),
});

/**
 * The beginning of the presentation flow.
 * To be implemented accordind to the user touchpoint
 *
 * @param Optional parameters, depending on the starting touchoint
 * @returns The url for the Relying Party to connect with
 */
export type StartFlow<T extends Array<unknown> = []> = (...args: T) => {
  requestUri: string;
  clientId: string;
};

/**
 * Start a presentation flow by decoding an incoming QR-code
 *
 * @param qrcode The encoded QR-code content
 * @returns The url for the Relying Party to connect with
 * @throws If the provided qr code fails to be decoded
 */
export const startFlowFromQR: StartFlow<[string, string]> = (
  requestUri: string,
  clientId: string
) => {
  const result = PresentationParams.safeParse({
    requestUri,
    clientId,
  });

  if (result.success) {
    return result.data;
  } else {
    throw new ValidationFailed({
      message: "Invalid parameters provided",
      reason: result.error.message,
    });
  }
};
