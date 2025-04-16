import { IoWalletError, serializeAttrs } from "../../utils/errors";

/**
 * An error subclass thrown when auth request decode fail
 *
 */
export class AuthRequestDecodeError extends IoWalletError {
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
 * When selecting a public key from an entity configuration, and no one meets the requirements for the scenario
 *
 */
export class NoSuitableKeysFoundInEntityConfiguration extends IoWalletError {
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
 * When a QR code is not valid.
 *
 */
export class InvalidQRCodeError extends IoWalletError {
  code = "ERR_INVALID_QR_CODE";

  /** Detailed reason for the QR code validation failure. */
  reason: string;

  constructor(reason: string) {
    super("Invalid QR code");
    this.reason = reason;
  }
}

/**
 * When the entity is unverified because the Relying Party is not trusted.
 *
 */
export class UnverifiedEntityError extends IoWalletError {
  code = "ERR_UNVERIFIED_RP_ENTITY";

  /**
   * @param reason A description of why the entity cannot be verified.
   */
  constructor(reason: string) {
    const message = `Unverified entity: ${reason}.`;
    super(message);
  }
}

/**
 * When some required data is missing to continue because certain attributes are not contained inside the wallet.
 *
 */
export class MissingDataError extends IoWalletError {
  code = "ERR_MISSING_DATA";

  /**
   * @param missingAttributes An array or description of the attributes that are missing.
   */
  constructor(missingAttributes: string) {
    const message = `Some required data is missing: ${missingAttributes}.`;
    super(message);
  }
}

export type NotFoundDetail = {
  id: string;
  reason?: string;
  vctValues?: string[];
};

/**
 * Error thrown when one or more credentials cannot be found in the wallet
 * and the presentation request cannot be satisfied.
 */
export class CredentialsNotFoundError extends IoWalletError {
  code = "ERR_CREDENTIALS_NOT_FOUND";
  details: NotFoundDetail[];

  /**
   * @param details The details of the credentials that could not be found.
   */
  constructor(details: NotFoundDetail[]) {
    super("One or more credentials cannot be found in the wallet");
    this.details = details;
  }
}
