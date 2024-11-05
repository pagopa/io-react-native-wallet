import { IoWalletError, serializeAttrs } from "../utils/errors";

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
 * An error subclass thrown when obtaining a wallet instance attestation which fails due to the integrity.
 */
export class WalletInstanceIntegrityFailedError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED" {
    return "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED";
  }

  code = "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED";

  reason: string;

  claim: string;

  constructor(message: string, claim: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, claim, reason }));
    this.reason = reason;
    this.claim = claim;
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
