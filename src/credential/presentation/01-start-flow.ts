import { ValidationFailed } from "../../utils/errors";
import { RequestObject } from "./types";

/**
 * The beginning of the presentation flow.
 * To be implemented accordind to the user touchpoint
 *
 * @param Optional parameters, depending on the starting touchoint
 * @returns The url for the Relying Party to connect with
 */
export type StartFlow<T extends Array<unknown> = []> = (
  ...args: T
) => RequestObject;

const getFromURLOrThrow = (url: URL, key: string) => {
  const val = url.searchParams.get(key);
  if (!val) {
    throw new Error(`Search param ${key} not found`);
  }
  return val;
};

/**
 * Start a presentation flow by decoding the parameters needed to start the presentation flow.
 *
 * @param qrcode The encoded QR-code content
 * @returns The url for the Relying Party to connect with
 * @throws If the provided qr code fails to be decoded
 */
export const startFlowFromQR: StartFlow<[URL]> = (qrCodeURL: URL) => {
  try {
    const client_id = getFromURLOrThrow(qrCodeURL, "client_id");
    const nonce = getFromURLOrThrow(qrCodeURL, "nonce");
    const response_uri = getFromURLOrThrow(qrCodeURL, "response_uri");
    const state = getFromURLOrThrow(qrCodeURL, "state");
    const dcql_query = getFromURLOrThrow(qrCodeURL, "dcql_query");
    const response_type = getFromURLOrThrow(qrCodeURL, "response_type");
    const response_mode = getFromURLOrThrow(qrCodeURL, "response_mode");

    return RequestObject.parse({
      nonce,
      response_uri,
      response_type,
      response_mode,
      client_id,
      state,
      dcql_query: JSON.parse(dcql_query),
    });
  } catch (e) {
    const message = (e as Error).message;
    throw new ValidationFailed({
      message: `Invalid presentation link`,
      reason: message,
    });
  }
};
