import type { ProblemDetail } from "../client/generated/wallet-provider";
import type { CredentialIssuerEntityConfiguration } from "../trust";
import {
  IssuerResponseErrorCodes,
  WalletProviderResponseErrorCodes,
  type GenericErrorReason,
  type IssuerErrorReasonsByCode,
  type IssuerResponseErrorCode,
  type WalletProviderResponseErrorCode,
} from "./error-codes";

export { IssuerResponseErrorCodes, WalletProviderResponseErrorCodes };

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
  attrs: Record<string, GenericErrorReason | number | Array<string> | undefined>
): string =>
  Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) return [k, `(${v.join(", ")})`];
      if (typeof v !== "string") return [k, JSON.stringify(v)];
      return [k, v];
    })
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
  reason: GenericErrorReason;

  constructor(params: {
    message: string;
    reason: GenericErrorReason;
    statusCode: number;
  }) {
    super(serializeAttrs(params));
    this.reason = params.reason;
    this.statusCode = params.statusCode;
  }
}

/**
 * An error subclass thrown when an Issuer HTTP request fails.
 * The specific error can be found in the `code` property.
 *
 * The class is generic over the error code to narrow down the reason.
 */
export class IssuerResponseError<
  T extends IssuerResponseErrorCode
> extends UnexpectedStatusCodeError {
  code: T;
  reason: IssuerErrorReasonsByCode[T];

  constructor(params: {
    code?: T;
    message: string;
    reason: IssuerErrorReasonsByCode[T];
    statusCode: number;
  }) {
    super(params);
    this.reason = params.reason;
    this.code = (params.code ??
      IssuerResponseErrorCodes.IssuerGenericError) as T;
  }
}

/**
 * An error subclass thrown when a Wallet Provider HTTP request fails.
 * The specific error can be found in the `code` property.
 */
export class WalletProviderResponseError extends UnexpectedStatusCodeError {
  code: WalletProviderResponseErrorCode;
  reason: ProblemDetail;

  constructor(params: {
    code?: WalletProviderResponseErrorCode;
    message: string;
    reason: ProblemDetail;
    statusCode: number;
  }) {
    super(params);
    this.reason = params.reason;
    this.code =
      params.code ??
      WalletProviderResponseErrorCodes.WalletProviderGenericError;
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
 * @throws {IoWalletError} When no credential config is found
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

/**
 * Type guard for issuer errors.
 * @param error The error to check
 * @param code Optional code to narrow down the issuer error
 */
export const isIssuerResponseError = <T extends IssuerResponseErrorCode>(
  error: unknown,
  code?: T
): error is IssuerResponseError<T> =>
  error instanceof IssuerResponseError && error.code === (code ?? error.code);

/**
 * Type guard for wallet provider errors.
 * @param error The error to check
 * @param code Optional code to narrow down the wallet provider error
 */
export const isWalletProviderResponseError = (
  error: unknown,
  code?: WalletProviderResponseErrorCode
): error is WalletProviderResponseError =>
  error instanceof WalletProviderResponseError &&
  error.code === (code ?? error.code);
