import { IoWalletError, serializeAttrs } from "../utils/errors";

/**
 * An error subclass thrown when an error occurs during the wallet instance creation process.
 */
export class WalletInstanceCreationError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_INSTANCE_CREATION_ERROR" {
    return "ERR_IO_WALLET_INSTANCE_CREATION_ERROR";
  }

  code = "ERR_IO_WALLET_INSTANCE_CREATION_ERROR";

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
export class WalletInstanceCreationIntegrityError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_INSTANCE_CREATION_INTEGRITY_ERROR" {
    return "ERR_IO_WALLET_INSTANCE_CREATION_INTEGRITY_ERROR";
  }

  code = "ERR_IO_WALLET_INSTANCE_CREATION_INTEGRITY_ERROR";

  reason: string;

  claim: string;

  constructor(message: string, claim: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, claim, reason }));
    this.reason = reason;
    this.claim = claim;
  }
}
