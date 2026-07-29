import {
  CredentialOfferError,
  resolveCredentialOffer as sdkResolveCredentialOffer,
} from "@pagopa/io-wallet-oid4vci";

import type { OfferApi } from "../api";

import { sdkConfigV1_3 } from "../../../utils/config";
import { InvalidQRCodeError } from "../common/errors";

/**
 * v1.3.3 implementation — first step of the User Request Flow
 * (IT-Wallet spec, Section 12.1.2).
 *
 * Delegates to the SDK's {@link sdkResolveCredentialOffer} for URI parsing
 * and by-reference fetching of the Credential Offer.
 *
 * Supported URI schemes: `openid-credential-offer://`, `haip-vci://`, `https://`.
 *
 * Structural validation and cross-validation against the Credential Issuer
 * metadata are **not** performed here; they belong to the dedicated
 * validate-credential-offer step of the flow.
 *
 * Resolution errors (bad scheme, missing params, network failure) are mapped
 * to {@link InvalidQRCodeError}.
 */
export const resolveCredentialOffer: OfferApi["resolveCredentialOffer"] =
  async (credentialOffer, callbacks = {}) => {
    const { fetch: fetchFn = fetch } = callbacks;

    // Parse the URI and fetch the offer when transmitted by reference
    const resolved = await sdkResolveCredentialOffer({
      callbacks: { fetch: fetchFn },
      config: sdkConfigV1_3,
      credentialOffer,
    }).catch((e: unknown) => {
      if (e instanceof CredentialOfferError) {
        throw new InvalidQRCodeError(e.message);
      }
      throw e;
    });

    return resolved;
  };
