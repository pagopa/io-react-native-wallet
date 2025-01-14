import * as z from "zod";
import { decodeBase64 } from "@pagopa/io-react-native-jwt";
import { AuthRequestDecodeError } from "./errors";

const QRCodePayload = z.object({
  protocol: z.string(),
  resource: z.string(), // TODO: refine to known paths using literals
  clientId: z.string(),
  requestURI: z.string(),
});

/**
 * The beginning of the presentation flow.
 * To be implemented accordind to the user touchpoint
 *
 * @param Optional parameters, depending on the starting touchoint
 * @returns The url for the Relying Party to connect with
 */
export type StartFlow<T extends Array<unknown> = []> = (...args: T) => {
  requestURI: string;
  clientId: string;
};

/**
 * Start a presentation flow by decoding an incoming QR-code
 *
 * @param qrcode The encoded QR-code content
 * @returns The url for the Relying Party to connect with
 * @throws If the provided qr code fails to be decoded
 */
export const startFlowFromQR: StartFlow<[string]> = (qrcode) => {
  let decodedUrl: URL;
  try {
    const decoded = decodeBase64(qrcode);
    decodedUrl = new URL(decoded);
  } catch (error) {
    throw new AuthRequestDecodeError("Failed to decode QR code: ", qrcode);
  }

  const protocol = decodedUrl.protocol;
  const resource = decodedUrl.hostname;
  const requestURI = decodedUrl.searchParams.get("request_uri");
  const clientId = decodedUrl.searchParams.get("client_id");

  const result = QRCodePayload.safeParse({
    protocol,
    resource,
    requestURI,
    clientId,
  });

  if (result.success) {
    return result.data;
  } else {
    throw new AuthRequestDecodeError(result.error.message, `${decodedUrl}`);
  }
};
