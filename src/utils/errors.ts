import type { ProblemDetail } from "../client/generated/wallet-provider";
import type { CredentialIssuerEntityConfiguration } from "../trust";
import {
  IssuerResponseErrorCodes,
  WalletProviderResponseErrorCodes,
  type IssuerResponseErrorCode,
  type WalletProviderResponseErrorCode,
} from "./error-codes";

export { IssuerResponseErrorCodes, WalletProviderResponseErrorCodes };

// An error reason that supports both a string and a generic JSON object
type GenericErrorReason = string | Record<string, unknown>;

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

  constructor({
    message,
    claim = "unspecified",
    reason = "unspecified",
  }: {
    message: string;
    claim?: string;
    reason?: string;
  }) {
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

  constructor({
    message,
    reason,
    statusCode,
  }: {
    message: string;
    reason: GenericErrorReason;
    statusCode: number;
  }) {
    super(serializeAttrs({ message, reason, statusCode }));
    this.reason = reason;
    this.statusCode = statusCode;
  }
}

/**
 * An error subclass thrown when an Issuer HTTP request fails.
 * The specific error can be found in the `code` property.
 *
 * The class is generic over the error code to narrow down the reason.
 */
export class IssuerResponseError extends UnexpectedStatusCodeError {
  code: IssuerResponseErrorCode;

  constructor(params: {
    code?: IssuerResponseErrorCode;
    message: string;
    reason: GenericErrorReason;
    statusCode: number;
  }) {
    super(params);
    this.code = params.code ?? IssuerResponseErrorCodes.IssuerGenericError;
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
export const isIssuerResponseError = (
  error: unknown,
  code?: IssuerResponseErrorCode
): error is IssuerResponseError =>
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

type ErrorCodeMap<T> = T extends typeof IssuerResponseError
  ? IssuerResponseErrorCode
  : T extends typeof WalletProviderResponseError
  ? WalletProviderResponseErrorCode
  : never;

/**
 * Builder class used to create specialized errors from type {@link UnexpectedStatusCodeError} that handles multiple status codes.
 *
 * Chain multiple `handle` to add cases that depend on the status code, then call `buildFrom` when done.
 *
 * For example:
 * ```
 * new ResponseErrorBuilder(IssuerResponseError)
 *   .handle(403, { code: "ERROR_CODE_1", message: "Forbidden" })
 *   .handle(500, { code: "ERROR_CODE_2", message: "Unexpected error" })
 *   .handle("*", { code: "ERROR_CODE_3", message: "Fallback" })
 *   .buildFrom(baseError)
 * ```
 */
export class ResponseErrorBuilder<T extends typeof UnexpectedStatusCodeError> {
  private errorCases: {
    [K in number | "*"]?: {
      code: ErrorCodeMap<T>;
      message: string;
      reason?: GenericErrorReason;
    };
  } = {};

  constructor(private ErrorClass: T) {}

  handle(status: number | "*", params: (typeof this.errorCases)[number]) {
    this.errorCases[status] = params;
    return this;
  }

  buildFrom(originalError: UnexpectedStatusCodeError) {
    const params =
      this.errorCases[originalError.statusCode] ?? this.errorCases["*"];

    if (params) {
      return new this.ErrorClass({ ...originalError, ...params });
    }

    return originalError;
  }
}
