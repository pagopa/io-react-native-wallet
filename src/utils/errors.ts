import type { CredentialIssuerEntityConfiguration } from "../trust";

export const IssuerResponseErrorCodes = {
  IssuerGeneric: "ERR_ISSUER_GENERIC_ERROR",
  /**
   * Error code thrown when a credential cannot be issued immediately because it follows the async flow.
   */
  CredentialIssuingNotSynchronous: "CREDENTIAL_ISSUING_NOT_SYNCHRONOUS_ERROR",
  /**
   * Error code thrown when an error occurs while requesting a credential.
   */
  CredentialRequest: "CREDENTIAL_REQUEST_ERROR",
  /**
   * Error code thrown when a credential status is invalid, either during issuance or when requesting a status attestation.
   */
  CredentialInvalidStatus: "ERR_CREDENTIAL_INVALID_STATUS",
  /**
   * Error code thrown when an error occurs while obtaining a status attestation for a credential.
   */
  StatusAttestationError: "ERR_STATUS_ATTESTATION_ERROR",
} as const;

export const WalletProviderResponseErrorCodes = {
  WalletProviderGeneric: "ERR_IO_WALLET_PROVIDER_GENERIC_ERROR",
  /**
   * An error code thrown when an error occurs during the wallet instance creation process.
   */
  WalletInstanceCreation: "ERR_IO_WALLET_INSTANCE_CREATION_ERROR",
  /**
   * An error code thrown when validation fail
   */
  WalletInstanceAttestationIssuing:
    "ERR_IO_WALLET_INSTANCE_ATTESTATION_ISSUING_FAILED",
  /**
   * An error code thrown when obtaining a wallet instance attestation which fails due to the integrity.
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

type IssuerResponseErrorCode =
  (typeof IssuerResponseErrorCodes)[keyof typeof IssuerResponseErrorCodes];
type WalletProviderResponseErrorCode =
  (typeof WalletProviderResponseErrorCodes)[keyof typeof WalletProviderResponseErrorCodes];
type UnexpectedStatusErrorCode =
  | IssuerResponseErrorCode
  | WalletProviderResponseErrorCode;

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
  attrs: Record<string, string | Array<string> | undefined>
): string =>
  Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
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
  code: string = "ERR_IO_WALLET_GENERIC";

  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * An error subclass thrown when validation fail
 *
 */
export class ValidationFailed extends IoWalletError {
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
 * An error subclass thrown when an HTTP request has a status code different from the one expected.
 */
export class UnexpectedStatusCodeError extends IoWalletError {
  code: string = "ERR_UNEXPECTED_STATUS_CODE";
  statusCode: number;
  reason: string;

  constructor(
    code: UnexpectedStatusErrorCode,
    message: string,
    reason: string,
    statusCode: number
  ) {
    super(
      serializeAttrs({ message, reason, statusCode: statusCode?.toString() })
    );
    this.code = code;
    this.reason = reason;
    this.statusCode = statusCode;
  }
}

/**
 * A generic error subclass thrown when an Issuer HTTP request fails.
 * This class can be extended to map more specific Issuer errors.
 */
export class IssuerResponseError extends UnexpectedStatusCodeError {
  constructor(
    code: IssuerResponseErrorCode,
    message: string,
    reason: string,
    statusCode: number
  ) {
    super(code, message, reason, statusCode);
  }
}

/**
 * A generic error subclass thrown when a Wallet Provider HTTP request fails.
 * This class can be extended to map more specific Wallet Provider errors.
 */
export class WalletProviderResponseError extends UnexpectedStatusCodeError {
  constructor(
    code: WalletProviderResponseErrorCode,
    message: string,
    reason: string,
    statusCode: number
  ) {
    super(code, message, reason, statusCode);
  }
}

type LocalizedIssuanceError = {
  [locale: string]: {
    title: string;
    description: string;
  };
};

/**
 * Function to extract the error message from the Entity Configuration's supported error codes.
 * @param errorCode The error code to map to a meaningful message
 * @param issuerConf The entity configuration for credentials
 * @param credentialType The type of credential the error belongs to
 * @returns A localized error {@link LocalizedIssuanceError} or undefined
 * @throws {Error} When no credential config is found
 */
export function extractErrorMessageFromIssuerConf(
  errorCode: string,
  {
    issuerConf,
    credentialType,
  }: {
    issuerConf: CredentialIssuerEntityConfiguration["payload"]["metadata"];
    credentialType: string;
  }
): LocalizedIssuanceError | undefined {
  const credentialConfiguration =
    issuerConf.openid_credential_issuer.credential_configurations_supported[
      credentialType
    ];

  if (!credentialConfiguration) {
    throw new IoWalletError(
      `No configuration found for ${credentialType} in the provided EC`
    );
  }

  const { issuance_errors_supported } = credentialConfiguration;

  if (!issuance_errors_supported?.[errorCode]) {
    return undefined;
  }

  const localesList = issuance_errors_supported[errorCode]!.display;

  return localesList.reduce(
    (acc, { locale, ...rest }) => ({ ...acc, [locale]: rest }),
    {} as LocalizedIssuanceError
  );
}
