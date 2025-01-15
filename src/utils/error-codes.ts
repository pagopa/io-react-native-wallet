export const IssuerResponseErrorCodes = {
  IssuerGenericError: "ERR_ISSUER_GENERIC_ERROR",
  /**
   * Error code thrown when an error occurs while requesting a credential.
   */
  CredentialRequestFailed: "ERR_CREDENTIAL_REQUEST_FAILED",
} as const;

export const WalletProviderResponseErrorCodes = {
  WalletProviderGenericError: "ERR_IO_WALLET_PROVIDER_GENERIC_ERROR",
  /**
   * An error code thrown when an error occurs during the wallet instance creation process.
   */
  WalletInstanceCreationFailed: "ERR_IO_WALLET_INSTANCE_CREATION_FAILED",
  /**
   * An error code thrown when validation fail
   */
  WalletInstanceAttestationIssuingFailed:
    "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED",
  /**
   * An error code thrown when the requester does not pass the integrity checks when interacting with the Wallet Provider.
   */
  WalletInstanceIntegrityFailed: "ERR_IO_WALLET_INSTANCE_INTEGRITY_FAILED",
  /**
   * An error code thrown when obtaining a wallet instance attestation but the wallet instance is revoked.
   */
  WalletInstanceRevoked: "ERR_IO_WALLET_INSTANCE_REVOKED",
  /**
   * An error code thrown when obtaining a wallet instance attestation but the wallet instance is not found.
   */
  WalletInstanceNotFound: "ERR_IO_WALLET_INSTANCE_NOT_FOUND",
} as const;

export type IssuerResponseErrorCode =
  (typeof IssuerResponseErrorCodes)[keyof typeof IssuerResponseErrorCodes];

export type WalletProviderResponseErrorCode =
  (typeof WalletProviderResponseErrorCodes)[keyof typeof WalletProviderResponseErrorCodes];
