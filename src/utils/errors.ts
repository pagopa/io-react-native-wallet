/**
 * utility to format a set of attributes into an error message string
 *
 * @example
 * // returns "foo=value bar=(list, item)"
 * serializeAttrs({ foo: "value", bar: ["list", "item"] })
 *
 * @param attrs A key value record set
 * @returns a human-readable serialization of the set
 */
export const serializeAttrs = (
  attrs: Record<string, string | string>
): string =>
  Object.entries(attrs)
    .map(([k, v]) => [k, Array.isArray(v) ? `(${v.join(", ")})` : v])
    .map((_) => _.join("="))
    .join(" ");

/**
 * A generic Error that all other io-wallet specific Error subclasses extend.
 *
 * @example Checking thrown error is a io-wallet one
 *
 * ```js
 * if (err instanceof errors.IoWalletError) {
 *   // ...
 * }
 * ```
 */
export class IoWalletError extends Error {
  /** A unique error code for the particular error subclass. */
  static get code(): string {
    return "ERR_IO_WALLET_GENERIC";
  }

  /** A unique error code for the particular error subclass. */
  code: string = "ERR_IO_WALLET_GENERIC";

  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
    // @ts-ignore
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * An error subclass thrown when a Wallet Provider http request has a status code different from the one expected.
 */
export class UnexpectedStatusCodeError extends IoWalletError {
  static get code(): "ERR_UNEXPECTED_STATUS_CODE" {
    return "ERR_UNEXPECTED_STATUS_CODE";
  }

  code = "ERR_UNEXPECTED_STATUS_CODE";

  /** HTTP status code */
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(
      serializeAttrs({
        message,
        statusCode: statusCode.toString(),
      })
    );
    this.statusCode = statusCode;
  }
}
/**
 * An error subclass thrown when validation fail
 *
 */
export class ValidationFailed extends IoWalletError {
  static get code(): "ERR_IO_WALLET_VALIDATION_FAILED" {
    return "ERR_IO_WALLET_VALIDATION_FAILED";
  }

  code = "ERR_IO_WALLET_VALIDATION_FAILED";

  /** The Claim for which the validation failed. */
  claim: string;

  /** Reason code for the validation failure. */
  reason: string;

  constructor(
    message: string,
    claim: string = "unspecified",
    reason: string = "unspecified"
  ) {
    super(serializeAttrs({ message, claim, reason }));
    this.claim = claim;
    this.reason = reason;
  }
}

/**
 * An error subclass thrown when validation fail
 *
 */
export class WalletInstanceAttestationIssuingError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED" {
    return "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED";
  }

  code = "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED";

  /** The Claim for which the validation failed. */
  claim: string;

  /** Reason code for the validation failure. */
  reason: string;

  constructor(
    message: string,
    claim: string = "unspecified",
    reason: string = "unspecified"
  ) {
    super(serializeAttrs({ message, claim, reason }));
    this.claim = claim;
    this.reason = reason;
  }
}

/**
 * An error subclass thrown when auth request decode fail
 *
 */
export class AuthRequestDecodeError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_AUTHENTICATION_REQUEST_DECODE_FAILED" {
    return "ERR_IO_WALLET_AUTHENTICATION_REQUEST_DECODE_FAILED";
  }

  code = "ERR_IO_WALLET_AUTHENTICATION_REQUEST_DECODE_FAILED";

  /** The Claim for which the validation failed. */
  claim: string;

  /** Reason code for the validation failure. */
  reason: string;

  constructor(
    message: string,
    claim: string = "unspecified",
    reason: string = "unspecified"
  ) {
    super(serializeAttrs({ message, claim, reason }));
    this.claim = claim;
    this.reason = reason;
  }
}

/**
 * An error subclass thrown when validation fail
 *
 */
export class PidIssuingError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_PID_ISSUING_FAILED" {
    return "ERR_IO_WALLET_PID_ISSUING_FAILED";
  }

  code = "ERR_IO_WALLET_PID_ISSUING_FAILED";

  /** The Claim for which the validation failed. */
  claim: string;

  /** Reason code for the validation failure. */
  reason: string;

  constructor(
    message: string,
    claim: string = "unspecified",
    reason: string = "unspecified"
  ) {
    super(serializeAttrs({ message, claim, reason }));
    this.claim = claim;
    this.reason = reason;
  }
}

/**
 * When claims are requested but not found in the credential
 *
 */
export class ClaimsNotFoundBetweenDislosures extends Error {
  static get code(): "ERR_CLAIMS_NOT_FOUND" {
    return "ERR_CLAIMS_NOT_FOUND";
  }

  code = "ERR_CLAIMS_NOT_FOUND";

  /** The Claims not found */
  claims: string[];

  constructor(claims: string | string[]) {
    const c = Array.isArray(claims) ? claims : [claims];
    const message = `Some requested claims are not present in the disclosurable values, claims: ${c.join(
      ", "
    )}`;
    super(message);
    this.claims = c;
  }
}

/**
 * When the SD-JWT does not contain an hashed reference to a given set of claims
 */
export class ClaimsNotFoundInToken extends Error {
  static get code(): "ERR_CLAIMS_NOT_FOUND_IN_TOKEN" {
    return "ERR_CLAIMS_NOT_FOUND_IN_TOKEN";
  }

  code = "ERR_CLAIMS_NOT_FOUND_IN_TOKEN";

  /** The Claims not found */
  claims: string[];

  constructor(claims: string | string[]) {
    const c = Array.isArray(claims) ? claims : [claims];
    const message = `Some claims are not found in the given token, claims: ${c.join(
      ", "
    )}`;
    super(message);
    this.claims = c;
  }
}

/**
 * When selecting a public key from an entity configuration, and no one meets the requirements for the scenario
 *
 */
export class NoSuitableKeysFoundInEntityConfiguration extends Error {
  static get code(): "ERR_NO_SUITABLE_KEYS_NOT_FOUND" {
    return "ERR_NO_SUITABLE_KEYS_NOT_FOUND";
  }

  code = "ERR_NO_SUITABLE_KEYS_NOT_FOUND";

  /**
   * @param scenario describe the scenario in which the error arise
   */
  constructor(scenario: string) {
    const message = `Entity configuration do not provide any suitable keys (${scenario}).`;
    super(message);
  }
}

/**
 * When selecting a public key from an entity configuration, and no one meets the requirements for the scenario
 *
 */
export class PidMetadataError extends Error {
  static get code(): "PID_METADATA_ERROR" {
    return "PID_METADATA_ERROR";
  }

  constructor(message: string) {
    super(message);
  }
}

/**
 * An error subclass thrown when a Wallet Provider http request fail
 *
 */
export class WalletProviderResponseError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_PROVIDER_RESPONSE_FAILED" {
    return "ERR_IO_WALLET_PROVIDER_RESPONSE_FAILED";
  }

  code = "ERR_IO_WALLET_PROVIDER_RESPONSE_FAILED";

  /** The Claim for which the validation failed. */
  claim: string;

  /** Reason code for the validation failure. */
  reason: string;

  /** HTTP status code */
  statusCode: number;

  constructor(
    message: string,
    claim: string = "unspecified",
    reason: string = "unspecified",
    statusCode: number
  ) {
    super(
      serializeAttrs({
        message,
        claim,
        reason,
        statusCode: statusCode.toString(),
      })
    );
    this.claim = claim;
    this.reason = reason;
    this.statusCode = statusCode;
  }
}

export class WalletInstanceRevokedError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_INSTANCE_REVOKED" {
    return "ERR_IO_WALLET_INSTANCE_REVOKED";
  }

  code = "ERR_IO_WALLET_INSTANCE_REVOKED";

  claim: string;
  reason: string;

  constructor(message: string, claim: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, claim, reason }));
    this.reason = reason;
    this.claim = claim;
  }
}

export class WalletInstanceNotFoundError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_INSTANCE_NOT_FOUND" {
    return "ERR_IO_WALLET_INSTANCE_NOT_FOUND";
  }

  code = "ERR_IO_WALLET_INSTANCE_NOT_FOUND";

  claim: string;
  reason: string;

  constructor(message: string, claim: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, claim, reason }));
    this.reason = reason;
    this.claim = claim;
  }
}

/**
 * An error subclass thrown when an error occurs during the authorization process.
 */
export class AuthorizationError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_AUTHORIZATION_ERROR" {
    return "ERR_IO_WALLET_AUTHORIZATION_ERROR";
  }

  code = "ERR_IO_WALLET_AUTHORIZATION_ERROR";

  constructor(message?: string) {
    super(message);
  }
}

/**
 * An error subclass thrown when an error occurs during the authorization process with the IDP.
 * It contains the error and error description returned by the IDP.
 */
export class AuthorizationIdpError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_IDENTIFICATION_RESPONSE_ERROR" {
    return "ERR_IO_WALLET_IDENTIFICATION_RESPONSE_ERROR";
  }

  code = "ERR_IO_WALLET_IDENTIFICATION_RESPONSE_PARSING_FAILED";

  error: string;
  errorDescription?: string;

  constructor(error: string, errorDescription?: string) {
    super(
      serializeAttrs(errorDescription ? { error, errorDescription } : { error })
    );
    this.error = error;
    this.errorDescription = errorDescription;
  }
}
