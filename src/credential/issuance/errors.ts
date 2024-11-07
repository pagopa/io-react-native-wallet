import {
  IoWalletError,
  IssuerResponseError,
  serializeAttrs,
} from "../../utils/errors";

/**
 * An error subclass thrown when an error occurs during the authorization process.
 */
export class AuthorizationError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_AUTHORIZATION_ERROR" {
    return "ERR_IO_WALLET_AUTHORIZATION_ERROR";
  }

  code = "ERR_IO_WALLET_AUTHORIZATION_ERROR";

  constructor(message?: string) {
    super(message);
  }
}

/**
 * An error subclass thrown when an error occurs during the authorization process with the IDP.
 * It contains the error and error description returned by the IDP.
 */
export class AuthorizationIdpError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_IDENTIFICATION_RESPONSE_ERROR" {
    return "ERR_IO_WALLET_IDENTIFICATION_RESPONSE_ERROR";
  }

  code = "ERR_IO_WALLET_IDENTIFICATION_RESPONSE_PARSING_FAILED";

  error: string;
  errorDescription?: string;

  constructor(error: string, errorDescription?: string) {
    super(serializeAttrs({ error, errorDescription }));
    this.error = error;
    this.errorDescription = errorDescription;
  }
}

/**
 * Error subclass thrown when an operation has been aborted.
 */
export class OperationAbortedError extends IoWalletError {
  static get code(): "ERR_IO_WALLET_OPERATION_ABORTED" {
    return "ERR_IO_WALLET_OPERATION_ABORTED";
  }

  code = "ERR_IO_WALLET_OPERATION_ABORTED";

  /** The aborted operation */
  operation: string;

  constructor(operation: string) {
    super(serializeAttrs({ operation }));
    this.operation = operation;
  }
}

/**
 * Error subclass thrown when a credential cannot be issued immediately because it follows the async flow.
 */
export class CredentialIssuingNotSynchronousError extends IssuerResponseError {
  static get code(): "CREDENTIAL_ISSUING_NOT_SYNCHRONOUS_ERROR" {
    return "CREDENTIAL_ISSUING_NOT_SYNCHRONOUS_ERROR";
  }

  code = "CREDENTIAL_ISSUING_NOT_SYNCHRONOUS_ERROR";

  constructor(message: string) {
    super(message, "Deferred issuance");
  }
}

/**
 * Error subclass thrown when an error occurs while requesting a credential.
 */
export class CredentialRequestError extends IssuerResponseError {
  static get code(): "CREDENTIAL_REQUEST_ERROR" {
    return "CREDENTIAL_REQUEST_ERROR";
  }

  code = "CREDENTIAL_REQUEST_ERROR";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}
