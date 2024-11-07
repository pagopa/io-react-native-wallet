import { WalletProviderResponseError } from "../utils/errors";

/**
 * An error subclass thrown when validation fail
 *
 */
export class WalletInstanceAttestationIssuingError extends WalletProviderResponseError {
  static get code(): "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED" {
    return "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED";
  }

  code = "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}

/**
 * An error subclass thrown when obtaining a wallet instance attestation which fails due to the integrity.
 */
export class WalletInstanceIntegrityFailedError extends WalletProviderResponseError {
  static get code(): "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED" {
    return "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED";
  }

  code = "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}

export class WalletInstanceRevokedError extends WalletProviderResponseError {
  static get code(): "ERR_IO_WALLET_INSTANCE_REVOKED" {
    return "ERR_IO_WALLET_INSTANCE_REVOKED";
  }

  code = "ERR_IO_WALLET_INSTANCE_REVOKED";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}

export class WalletInstanceNotFoundError extends WalletProviderResponseError {
  static get code(): "ERR_IO_WALLET_INSTANCE_NOT_FOUND" {
    return "ERR_IO_WALLET_INSTANCE_NOT_FOUND";
  }

  code = "ERR_IO_WALLET_INSTANCE_NOT_FOUND";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}
