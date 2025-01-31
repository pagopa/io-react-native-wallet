import * as z from "zod";
import { InvalidQRCodeError } from "./errors";

const QRCodePayload = z.object({
  protocol: z.string(),
  resource: z.string(), // TODO: refine to known paths using literals
  clientId: z.string(),
  requestURI: z.string(),
  requestURIMethod: z.enum(["get", "post"]),
  state: z.string().optional(),
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
  requestURIMethod?: "get" | "post";
  state?: string;
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
    // splitting qrcode to identify which is link format
    const originalQrCode = qrcode.split("://");
    const replacedQrcode = originalQrCode[1]?.startsWith("?")
      ? qrcode.replace(`${originalQrCode[0]}://`, "https://wallet.example/")
      : qrcode;

    decodedUrl = new URL(replacedQrcode);
  } catch (error) {
    throw new InvalidQRCodeError(`Failed to decode QR code:  ${qrcode}`);
  }

  const protocol = decodedUrl.protocol;
  const resource = decodedUrl.hostname;
  const requestURI = decodedUrl.searchParams.get("request_uri");
  const requestURIMethod =
    decodedUrl.searchParams.get("request_uri_method") ?? "get";
  const clientId = decodedUrl.searchParams.get("client_id");
  const state = decodedUrl.searchParams.get("state") ?? undefined;

  const result = QRCodePayload.safeParse({
    protocol,
    resource,
    requestURI,
    requestURIMethod,
    clientId,
    state,
  });

  if (result.success) {
    return result.data;
  } else {
    throw new InvalidQRCodeError(`${result.error.message}, ${decodedUrl}`);
  }
};
