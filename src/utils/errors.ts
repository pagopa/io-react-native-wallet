import type { CredentialIssuerEntityConfiguration } from "../trust/types";

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
  /** The stringified response body, useful to process the error response */
  responseBody: string;

  constructor(message: string, statusCode: number, responseBody: string) {
    super(
      serializeAttrs({
        message,
        statusCode: statusCode.toString(),
      })
    );
    this.statusCode = statusCode;
    this.responseBody = responseBody;
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

type LocalizedIssuanceError = {
  [locale: string]: {
    title: string;
    description: string;
  };
};

/**
 * Function to extract the error message from the Entity Configuration's supported error codes.
 * @param errorCode The error code to map to a meaningful message
 * @param params.issuerConf The entity configuration for credentials
 * @param params.credentialType The type of credential the error belongs to
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
    throw new Error(
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
