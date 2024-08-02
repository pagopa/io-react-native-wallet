import { IoWalletError, serializeAttrs } from "../../utils/errors";

export class StatusAttestationInvalid extends IoWalletError {
  static get code(): "ERR_STATUS_ATTESTATION_INVALID" {
    return "ERR_STATUS_ATTESTATION_INVALID";
  }

  code = "ERR_STATUS_ATTESTATION_INVALID";

  claim: string;
  reason: string;

  constructor(message: string, claim: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, claim, reason }));
    this.reason = reason;
    this.claim = claim;
  }
}

export class StatusAttestationError extends IoWalletError {
  static get code(): "ERR_STATUS_ATTESTATION_ERROR" {
    return "ERR_STATUS_ATTESTATION_ERROR";
  }

  code = "ERR_STATUS_ATTESTATION_ERROR";

  claim: string;
  reason: string;

  constructor(message: string, claim: string, reason: string = "unspecified") {
    super(serializeAttrs({ message, claim, reason }));
    this.reason = reason;
    this.claim = claim;
  }
}
