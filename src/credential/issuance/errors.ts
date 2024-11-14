import { IoWalletError, serializeAttrs } from "../../utils/errors";

/**
 * An error subclass thrown when an error occurs during the authorization process.
 */
export class AuthorizationError extends IoWalletError {
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
  code = "ERR_IO_WALLET_OPERATION_ABORTED";

  /** The aborted operation */
  operation: string;

  constructor(operation: string) {
    super(serializeAttrs({ operation }));
    this.operation = operation;
  }
}
