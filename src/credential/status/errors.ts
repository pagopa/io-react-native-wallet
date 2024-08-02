import { IoWalletError, serializeAttrs } from "../../utils/errors";

export class StatusAttestationInvalid extends IoWalletError {
  static get code(): "ERR_STATUS_ATTESTATION_INVALID" {
    return "ERR_STATUS_ATTESTATION_INVALID";
  }

  code = "ERR_STATUS_ATTESTATION_INVALID";

  reason: string;

  constructor(message: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, reason }));
    this.reason = reason;
  }
}

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
