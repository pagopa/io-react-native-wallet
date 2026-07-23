import {
  CredentialOfferError,
  extractGrantDetails as sdkExtractGrantDetails,
} from "@pagopa/io-wallet-oid4vci";

import type { OfferApi } from "../api";

import { sdkConfigV1_4 } from "../../../utils/config";
import { withMappedErrors } from "../../../utils/errors";
import { InvalidCredentialOfferError } from "../common/errors";

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
  withMappedErrors(
    () =>
      sdkExtractGrantDetails({
        config: sdkConfigV1_4,
        credentialOffer: offer,
      }),
    CredentialOfferError,
    (e) => new InvalidCredentialOfferError(e.message),
  );
