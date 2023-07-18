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
 * An error subclass thrown when PID validation fail
 *
 */
export class PIDValidationFailed extends IoWalletError {
  static get code(): "ERR_IO_WALLET_PID_VALIDATION_FAILED" {
    return "ERR_IO_WALLET_PID_VALIDATION_FAILED";
  }

  code = "ERR_IO_WALLET_PID_VALIDATION_FAILED";

  /** The Claim for which the validation failed. */
  claim: string;

  /** Reason code for the validation failure. */
  reason: string;

  constructor(message: string, claim = "unspecified", reason = "unspecified") {
    super(message);
    this.claim = claim;
    this.reason = reason;
  }
}
