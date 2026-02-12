import {
  extractGrantDetails as sdkExtractGrantDetails,
  CredentialOfferError,
} from "@pagopa/io-wallet-oid4vci";
import { InvalidCredentialOfferError } from "../common/errors";
import type { OfferApi } from "../api";

const withMappedErrors = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof CredentialOfferError) {
      throw new InvalidCredentialOfferError(e.message);
    }
    throw e;
  }
};

/**
 * v1.3.3 implementation — second and final step of the User Request Flow
 * (IT-Wallet spec, Section 12.1.2).
 *
 * IT-Wallet v1.3 only supports the `authorization_code` grant type;
 * the returned result always has `grantType: "authorization_code"`.
 * The extracted `scope` is later used in the Authorization Request,
 * and `issuerState` (when present) binds the request to the Credential
 * Issuer session.
 *
 * Delegates directly to the SDK's {@link sdkExtractGrantDetails} — no local
 * mapping is needed because the SDK already returns `ExtractGrantDetailsResult`.
 */
export const extractGrantDetails: OfferApi["extractGrantDetails"] = (offer) =>
  withMappedErrors(() => sdkExtractGrantDetails(offer));
