import { Logger, LogLevel } from "../../../utils/logging";
import { InvalidQRCodeError } from "../common/errors";
import { CredentialOfferParams } from "./types";
import type { OfferApi } from "../api";

const CREDENTIAL_OFFER_SCHEMES = [
  "openid-credential-offer://",
  "haip://",
  "haip-vci://",
];
const CREDENTIAL_OFFER_PARAM = "credential_offer";
const CREDENTIAL_OFFER_URI_PARAM = "credential_offer_uri";

/**
 * Start a credential offer flow by validating and parse an encoded url
 * extracted from a QR code or a deep link.
 */
export const startFlow: OfferApi["startFlow"] = (encodedUrl) => {
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
