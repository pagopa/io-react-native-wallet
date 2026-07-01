import {
  resolveCredentialOffer as sdkResolveCredentialOffer,
  CredentialOfferError,
} from "@pagopa/io-wallet-oid4vci";
import { InvalidQRCodeError } from "../common/errors";
import type { OfferApi } from "../api";
import { sdkConfigV1_4 } from "../../../utils/config";

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
      config: sdkConfigV1_4,
      credentialOffer,
      callbacks: { fetch: fetchFn },
    }).catch((e: unknown) => {
      if (e instanceof CredentialOfferError) {
        throw new InvalidQRCodeError(e.message);
      }
      throw e;
    });

    return resolved;
  };
