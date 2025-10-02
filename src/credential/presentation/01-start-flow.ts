import * as z from "zod";
import { InvalidQRCodeError } from "./errors";

const PresentationParams = z.object({
  client_id: z.string().nonempty(),
  request_uri: z.string().url(),
  request_uri_method: z.enum(["get", "post"]),
  state: z.string().optional(),
});
export type PresentationParams = z.infer<typeof PresentationParams>;

/**
 * The beginning of the presentation flow.
 * To be implemented according d to the user touchpoint
 *
 * @param params Presentation parameters, depending on the starting touchpoint
 * @returns The url for the Relying Party to connect with
 */
export type StartFlow = (params: {
  [K in keyof PresentationParams]?: PresentationParams[K] | null;
}) => PresentationParams;

/**
 * Start a presentation flow by validating the required parameters.
 * Parameters are extracted from a url encoded in a QR code or in a deep link.
 *
 * @param params The parameters to be validated
 * @returns The url for the Relying Party to connect with
 * @throws If the provided parameters are not valid
 */
export const startFlowFromQR: StartFlow = (params) => {
  const result = PresentationParams.safeParse({
    ...params,
    request_uri_method: params.request_uri_method ?? "get",
  });

  if (result.success) {
    return result.data;
  }

  throw new InvalidQRCodeError(result.error.message);
};
