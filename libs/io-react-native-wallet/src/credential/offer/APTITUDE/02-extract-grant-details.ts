import {
  CredentialOfferError,
  extractGrantDetails as sdkExtractGrantDetails,
} from "@pagopa/io-wallet-oid4vci";

import type { OfferApi } from "../api";

import { sdkConfigAPTITUDE } from "../../../utils/config";
import { withMappedErrors } from "../../../utils/errors";
import { InvalidCredentialOfferError } from "../common/errors";

/**
 * Second and final step of the User Request Flow
 * (IT-Wallet spec, Section 12.1.2).
 *
 * APTITUDE supports both authorization-code and pre-authorized-code grants.
 * The returned grant details identify which request to use when obtaining
 * the access token.
 *
 * Delegates directly to the SDK's {@link sdkExtractGrantDetails} — no local
 * mapping is needed because the SDK already returns `ExtractGrantDetailsResult`.
 */
export const extractGrantDetails: OfferApi["extractGrantDetails"] = (offer) =>
  withMappedErrors(
    () =>
      sdkExtractGrantDetails({
        config: sdkConfigAPTITUDE,
        credentialOffer: offer,
      }),
    CredentialOfferError,
    (e) => new InvalidCredentialOfferError(e.message),
  );
