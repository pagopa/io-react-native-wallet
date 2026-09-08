import { IoWalletError } from "../../../utils/errors";

export class InvalidCredentialOfferError extends IoWalletError {
  override code = "ERR_INVALID_CREDENTIAL_OFFER";
}

export class InvalidQRCodeError extends IoWalletError {
  override code = "ERR_INVALID_QR_CODE";
}
