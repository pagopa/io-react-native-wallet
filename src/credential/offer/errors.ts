import { IoWalletError } from "../../utils/errors";

export class InvalidCredentialOfferError extends IoWalletError {
  code = "ERR_INVALID_CREDENTIAL_OFFER";

  constructor(message?: string) {
    super(message);
  }
}

export class InvalidQRCodeError extends IoWalletError {
  code = "ERR_INVALID_QR_CODE";

  constructor(message?: string) {
    super(message);
  }
}
