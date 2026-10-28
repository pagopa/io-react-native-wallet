import {
  ResponseErrorBuilder,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";

/**
 * Shared handler for errors that occur during Wallet Instance Attestation issuance.
 */
export const handleAttestationCreationError = (e: unknown) => {
  Logger.log(
    LogLevel.ERROR,
    `An error occurred while calling the Wallet Attestation endpoint: ${e}`,
  );

  if (!(e instanceof WalletProviderResponseError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(WalletProviderResponseError)
    .handle(403, {
      code: WalletProviderResponseErrorCodes.WalletInstanceRevoked,
      message: "Unable to get an attestation for a revoked Wallet Instance",
    })
    .handle(404, {
      code: WalletProviderResponseErrorCodes.WalletInstanceNotFound,
      message:
        "Unable to get an attestation for a Wallet Instance that does not exist",
    })
    .handle(409, {
      code: WalletProviderResponseErrorCodes.WalletInstanceIntegrityFailed,
      message:
        "Unable to get an attestation for a Wallet Instance that failed the integrity check",
    })
    .handle("*", {
      code: WalletProviderResponseErrorCodes.WalletInstanceAttestationIssuingFailed,
      message: "Unable to obtain wallet instance attestation",
    })
    .buildFrom(e);
};
