import { IssuerResponseError } from "../../utils/errors";

/**
 * Error subclass thrown when a credential status is invalid, either during issuance or when requesting a status attestation.
 */
export class CredentialInvalidStatusError extends IssuerResponseError {
  static get code(): "ERR_CREDENTIAL_INVALID_STATUS" {
    return "ERR_CREDENTIAL_INVALID_STATUS";
  }

  code = "ERR_CREDENTIAL_INVALID_STATUS";

  /**
   * The error code that should be mapped with one of the `issuance_errors_supported` in the EC.
   */
  errorCode: string;

  constructor(message: string, reason: string, errorCode: string) {
    super(message, reason);
    this.errorCode = errorCode;
  }
}

/**
 * Error subclass thrown when an error occurs while obtaining a status attestation for a credential.
 */
export class StatusAttestationError extends IssuerResponseError {
  static get code(): "ERR_STATUS_ATTESTATION_ERROR" {
    return "ERR_STATUS_ATTESTATION_ERROR";
  }

  code = "ERR_STATUS_ATTESTATION_ERROR";

  constructor(message: string, reason: string) {
    super(message, reason);
  }
}
