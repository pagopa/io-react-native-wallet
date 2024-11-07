import { WalletProviderResponseError } from "../utils/errors";

/**
 * An error subclass thrown when an error occurs during the wallet instance creation process.
 */
export class WalletInstanceCreationError extends WalletProviderResponseError {
  static get code(): "ERR_IO_WALLET_INSTANCE_CREATION_ERROR" {
    return "ERR_IO_WALLET_INSTANCE_CREATION_ERROR";
  }

  code = "ERR_IO_WALLET_INSTANCE_CREATION_ERROR";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}

/**
 * An error subclass thrown when obtaining a wallet instance attestation which fails due to the integrity.
 */
export class WalletInstanceCreationIntegrityError extends WalletProviderResponseError {
  static get code(): "ERR_IO_WALLET_INSTANCE_CREATION_INTEGRITY_ERROR" {
    return "ERR_IO_WALLET_INSTANCE_CREATION_INTEGRITY_ERROR";
  }

  code = "ERR_IO_WALLET_INSTANCE_CREATION_INTEGRITY_ERROR";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}
