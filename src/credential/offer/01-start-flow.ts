import * as z from "zod";
import { Logger, LogLevel } from "../../utils/logging";
import { stringToJSONSchema } from "../../utils/zod";
import { InvalidQRCodeError } from "./errors";
import { CredentialOfferSchema } from "./types";

const CREDENTIAL_OFFER_SCHEMES = [
  "openid-credential-offer://",
  "haip://",
  "haip-vp://",
  "haip-vci://",
];
const CREDENTIAL_OFFER_PARAM = "credential_offer";
const CREDENTIAL_OFFER_URI_PARAM = "credential_offer_uri";

const CredentialOfferParams = z.union([
  z.object({
    credential_offer: stringToJSONSchema.pipe(CredentialOfferSchema),
    credential_offer_uri: z.undefined(),
  }),
  z.object({
    credential_offer: z.undefined(),
    credential_offer_uri: z.string().url(),
  }),
]);
type CredentialOfferParams = z.infer<typeof CredentialOfferParams>;

/**
 * The beginning of the credential offer flow.
 * To be implemented according to the user touchpoint
 *
 * @param params Credential offer encoded url
 * @returns Object containing the credential offer by reference or by value
 */
export type StartFlow = (encodedUrl: string) => CredentialOfferParams;

/**
 * Start a credential offer flow by validating and parse an encoded url
 * extracted from a QR code or a deep link.
 *
 * @param params The encoded url to be validated and parsed
 * @returns Object containing the credential offer by reference or by value
 * @throws If the provided encoded url is not valid
 */
export const startFlowFromQR: StartFlow = (encodedUrl) => {
  const hasValidScheme = CREDENTIAL_OFFER_SCHEMES.some((prefix) =>
    encodedUrl.startsWith(prefix)
  );

  if (!hasValidScheme) {
    throw new InvalidQRCodeError("Url must have one of the supported schemes");
  }

  const url = new URL(encodedUrl);
  const offerParam = url.searchParams.get(CREDENTIAL_OFFER_PARAM);
  const offerUriParam = url.searchParams.get(CREDENTIAL_OFFER_URI_PARAM);

  if (offerParam) {
    const decoded = decodeURIComponent(offerParam);
    const result = CredentialOfferParams.safeParse({
      credential_offer: decoded,
    });

    if (result.success) {
      return result.data;
    }

    Logger.log(
      LogLevel.ERROR,
      `Invalid credential offer object found in QR Code: ${result.error.message}`
    );
    throw new InvalidQRCodeError(result.error.message);
  }

  if (offerUriParam) {
    const decoded = decodeURIComponent(offerUriParam);
    const result = CredentialOfferParams.safeParse({
      credential_offer_uri: decoded,
    });

    if (result.success) {
      return result.data;
    }

    Logger.log(
      LogLevel.ERROR,
      `Invalid credential offer URI found in QR Code: ${result.error.message}`
    );
    throw new InvalidQRCodeError(result.error.message);
  }

  Logger.log(LogLevel.ERROR, `Invalid credential offer QR Code:`);
  throw new InvalidQRCodeError("QR Code does not contain valid params");
};
