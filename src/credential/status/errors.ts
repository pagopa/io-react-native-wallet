import { IoWalletError, serializeAttrs } from "../../utils/errors";

/**
 * Error subclass thrown when an error occurs while obtaining a status attestation for a credential.
 */
export class StatusAttestationError extends IoWalletError {
  static get code(): "ERR_STATUS_ATTESTATION_ERROR" {
    return "ERR_STATUS_ATTESTATION_ERROR";
  }

  code = "ERR_STATUS_ATTESTATION_ERROR";

  reason: string;

  constructor(message: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, reason }));
    this.reason = reason;
  }
}

/**
 * Error subclass thrown when a credential status is invalid, either during issuance or when requesting a status attestation.
 */
export class CredentialInvalidStatusError extends IoWalletError {
  static get code(): "ERR_CREDENTIAL_INVALID_STATUS" {
    return "ERR_CREDENTIAL_INVALID_STATUS";
  }

  code = "ERR_CREDENTIAL_INVALID_STATUS";

  /**
   * The error code that should be mapped with one of the `issuance_errors_supported` in the EC.
   */
  errorCode: string;
  reason: string;

  constructor(
    message: string,
    errorCode: string,
    reason: string = "unspecified"
  ) {
    super(serializeAttrs({ message, errorCode, reason }));
    this.errorCode = errorCode;
    this.reason = reason;
  }
}
