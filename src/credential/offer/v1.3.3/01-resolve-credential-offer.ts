import {
  resolveCredentialOffer as sdkResolveCredentialOffer,
  validateCredentialOffer,
  CredentialOfferError,
} from "@pagopa/io-wallet-oid4vci";
import {
  InvalidQRCodeError,
  InvalidCredentialOfferError,
} from "../common/errors";
import type { OfferApi } from "../api";

/**
 * v1.3.3 implementation — first step of the User Request Flow
 * (IT-Wallet spec, Section 12.1.2).
 *
 * Delegates to the SDK's {@link sdkResolveCredentialOffer} for URI parsing
 * and by-reference fetching, then to {@link validateCredentialOffer} for
 * IT-Wallet v1.3 structural checks:
 * - `credential_issuer` must be an HTTPS URL
 * - `grants` object is required
 * - `authorization_code` grant is required
 * - `scope` is required within `authorization_code`
 *
 * Supported URI schemes: `openid-credential-offer://`, `haip-vci://`, `https://`.
 *
 * Cross-validation against Credential Issuer metadata (e.g. matching
 * `credential_configuration_ids` or `authorization_server`) is **not** performed
 * here; per the spec it belongs to the Issuance Flow.
 *
 * Resolution errors (bad scheme, missing params, network failure) are mapped
 * to {@link InvalidQRCodeError}; validation errors are mapped to
 * {@link InvalidCredentialOfferError}.
 */
export const resolveCredentialOffer: OfferApi["resolveCredentialOffer"] =
  async (credentialOffer, callbacks = {}) => {
    const { fetch: fetchFn = fetch } = callbacks;

    // Parse the URI and fetch the offer when transmitted by reference
    const resolved = await sdkResolveCredentialOffer({
      credentialOffer,
      callbacks: { fetch: fetchFn },
    }).catch((e: unknown) => {
      if (e instanceof CredentialOfferError) {
        throw new InvalidQRCodeError(e.message);
      }
      throw e;
    });

    // Structural validation (no metadata cross-checks at this stage)
    await validateCredentialOffer({
      credentialOffer: resolved,
    }).catch((e: unknown) => {
      if (e instanceof CredentialOfferError) {
        throw new InvalidCredentialOfferError(e.message);
      }
      throw e;
    });

    return resolved;
  };
