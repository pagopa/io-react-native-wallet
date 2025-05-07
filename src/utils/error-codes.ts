export const IssuerResponseErrorCodes = {
  IssuerGenericError: "ERR_ISSUER_GENERIC_ERROR",
  /**
   * Error code thrown when a credential cannot be issued immediately because it follows the async flow.
   */
  CredentialIssuingNotSynchronous: "ERR_CREDENTIAL_ISSUING_NOT_SYNCHRONOUS",
  /**
   * Error code thrown when an error occurs while requesting a credential.
   */
  CredentialRequestFailed: "ERR_CREDENTIAL_REQUEST_FAILED",
  /**
   * Error code thrown when a credential status is invalid, either during issuance or when requesting a status attestation.
   */
  CredentialInvalidStatus: "ERR_CREDENTIAL_INVALID_STATUS",
  /**
   * Error code thrown when an error occurs while obtaining a status attestation for a credential.
   */
  StatusAttestationRequestFailed: "ERR_STATUS_ATTESTATION_REQUEST_FAILED",
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

export const RelyingPartyResponseErrorCodes = {
  RelyingPartyGenericError: "ERR_RP_GENERIC_ERROR",
  /**
   * An error code thrown then the Relying Party rejects the Wallet's Authorization Response.
   */
  InvalidAuthorizationResponse: "ERR_RP_INVALID_AUTHORIZATION_RESPONSE",
} as const;

export type IssuerResponseErrorCode =
  (typeof IssuerResponseErrorCodes)[keyof typeof IssuerResponseErrorCodes];

export type WalletProviderResponseErrorCode =
  (typeof WalletProviderResponseErrorCodes)[keyof typeof WalletProviderResponseErrorCodes];

export type RelyingPartyResponseErrorCode =
  (typeof RelyingPartyResponseErrorCodes)[keyof typeof RelyingPartyResponseErrorCodes];
