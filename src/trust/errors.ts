import { IoWalletError, serializeAttrs } from "../utils/errors";
import type { CertificateValidationStatus } from "@pagopa/io-react-native-crypto"; // Ensure this path is correct

/**
 * Base class for all federation-specific errors.
 */
export class FederationError extends IoWalletError {
  public readonly details: Record<string, unknown> | undefined;
  constructor(message: string, details?: Record<string, unknown>) {
    super(details ? serializeAttrs({ message, ...details }) : message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

/**
 * Error thrown when a trust chain is unexpectedly empty.
 */
export class TrustChainEmptyError extends FederationError {
  code = "ERR_FED_TRUST_CHAIN_EMPTY";
  constructor(message = "Trust chain cannot be empty.") {
    super(message, undefined);
  }
}

/**
 * Error thrown when a token is unexpectedly missing from a trust chain during processing.
 */
export class TrustChainTokenMissingError extends FederationError {
  code = "ERR_FED_TRUST_CHAIN_TOKEN_MISSING";
  constructor(message: string, details?: { index?: number }) {
    super(message, details);
  }
}

/**
 * Error thrown when renewing a trust chain fails.
 * This class itself might be used or could be considered a more general renewal error.
 */
export class TrustChainRenewalError extends FederationError {
  code = "ERR_FED_TRUST_CHAIN_RENEWAL_FAILED";
  constructor(
    message: string,
    details?: { originalChain?: string[]; [key: string]: unknown }
  ) {
    super(message, details);
  }
}

export class FederationListParseError extends FederationError {
  code = "ERR_FED_FEDERATION_LIST_PARSE_FAILED";
  constructor(message: string, details: { url: string; parseError?: string }) {
    super(message, details);
  }
}

/**
 * General error thrown during the trust chain building process.
 */
export class BuildTrustChainError extends FederationError {
  code = "ERR_FED_BUILD_TRUST_CHAIN_FAILED";
  constructor(
    message: string,
    details?: {
      relyingPartyUrl?: string;
      trustAnchorKid?: string;
      [key: string]: unknown;
    }
  ) {
    super(message, details);
  }
}

/**
 * Error thrown when the Trust Anchor's key is missing a 'kid'.
 */
export class TrustAnchorKidMissingError extends FederationError {
  code = "ERR_FED_TRUST_ANCHOR_KID_MISSING";
  constructor(message = "Missing 'kid' in provided Trust Anchor key.") {
    super(message, undefined);
  }
}

/**
 * Error thrown if the Relying Party is not found in the Trust Anchor's federation list.
 */
export class RelyingPartyNotAuthorizedError extends FederationError {
  code = "ERR_FED_RELYING_PARTY_NOT_AUTHORIZED";
  constructor(
    message: string,
    details: { relyingPartyUrl: string; federationListEndpoint?: string }
  ) {
    super(message, details);
  }
}

/**
 * Error thrown when a 'federation_fetch_endpoint' is missing in an entity's configuration.
 */
export class MissingFederationFetchEndpointError extends FederationError {
  code = "ERR_FED_MISSING_FEDERATION_FETCH_ENDPOINT";
  constructor(
    message: string,
    details: { entityBaseUrl: string; missingInEntityUrl: string }
  ) {
    super(message, details);
  }
}

/**
 * Error thrown when the X.509 certificate chain is missing in an entity's configuration.
 */
export class MissingX509CertsError extends FederationError {
  code = "ERR_FED_MISSING_X509_CERTS";
  constructor(message: string) {
    super(message, undefined);
  }
}

/**
 * Error thrown when an X.509 certificate validation fails.
 * This is used to indicate issues with the certificate chain or signature verification.
 */
export class X509ValidationError extends FederationError {
  code = "ERR_FED_X509_VALIDATION_FAILED";
  constructor(
    message: string,
    details?: {
      tokenIndex?: number;
      kid?: string;
      x509ValidationStatus?: CertificateValidationStatus;
      x509ErrorMessage?: string;
      [key: string]: unknown;
    }
  ) {
    super(message, details);
  }
}
