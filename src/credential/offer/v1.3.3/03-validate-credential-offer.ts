import {
  validateCredentialOffer as sdkValidateCredentialOffer,
  CredentialOfferError,
} from "@pagopa/io-wallet-oid4vci";
import { InvalidCredentialOfferError } from "../common/errors";
import type { OfferApi } from "../api";
import { sdkConfigV1_3 } from "../../../utils/config";

/**
 * v1.3.3 implementation — validates a resolved Credential Offer against the
 * Credential Issuer metadata (IT-Wallet spec, Section 12.1.2).
 *
 * Performs the IT-Wallet v1.3 structural checks on the offer and, when the
 * Credential Issuer relies on multiple Authorization Servers, ensures the
 * `authorization_server` selected by the offer matches one of the advertised
 * `authorization_servers`.
 *
 * Delegates to the SDK's {@link sdkValidateCredentialOffer}; validation errors
 * are mapped to {@link InvalidCredentialOfferError}.
 */
export const validateCredentialOffer: OfferApi["validateCredentialOffer"] =
  async ({ offer, credentialIssuerMetadata }) => {
    await sdkValidateCredentialOffer({
      config: sdkConfigV1_3,
      credentialOffer: offer,
      credentialIssuerMetadata,
    }).catch((e: unknown) => {
      if (e instanceof CredentialOfferError) {
        throw new InvalidCredentialOfferError(e.message);
      }
      throw e;
    });
  };
