import type { IntegrityContext } from "../../utils/integrity";

import { getWalletProviderClient } from "../../client";
import {
  ResponseErrorBuilder,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../../utils/errors";
import { Logger, LogLevel } from "../../utils/logging";

export interface CreateWalletInstanceContext {
  appFetch?: typeof fetch;
  integrityContext: IntegrityContext;
  isRenewal?: boolean;
  walletProviderBaseUrl: string;
}

/**
 * Register a Wallet Instance to the EUDI Wallet Provider, bound to the hardware key of the integrity context.
 * Copy of the IT-Wallet implementation, kept separate to evolve with the EUDI Wallet Provider.
 *
 * @param context.integrityContext The hardware key pair associated with the Wallet Instance
 * @param context.walletProviderBaseUrl Base url of the Wallet Provider
 * @param context.isRenewal (optional) Whether the Wallet Instance renews an existing one
 * @param context.appFetch (optional) Http client
 * @returns The hardware key tag, which identifies the Wallet Instance
 * @throws {WalletProviderResponseError} with a specific code for more context
 */
export const createWalletInstance = async (
  context: CreateWalletInstanceContext,
): Promise<string> => {
  const { integrityContext, isRenewal } = context;
  const api = getWalletProviderClient(context);

  const challenge = await api.get("/nonce").then((response) => response.nonce);

  Logger.log(
    LogLevel.DEBUG,
    `Challenge obtained from ${context.walletProviderBaseUrl}: ${challenge}`,
  );

  const keyAttestation = await integrityContext.getAttestation(challenge);
  const hardwareKeyTag = integrityContext.getHardwareKeyTag();

  Logger.log(
    LogLevel.DEBUG,
    `Hardware attestation: ${keyAttestation}\nAssociated hardware key tag: ${hardwareKeyTag}`,
  );

  await api
    .post("/wallet-instances", {
      body: {
        challenge,
        hardware_key_tag: hardwareKeyTag,
        is_renewal: isRenewal,
        key_attestation: keyAttestation,
      },
    })
    .catch(handleCreateWalletInstanceError);

  return hardwareKeyTag;
};

const handleCreateWalletInstanceError = (e: unknown) => {
  Logger.log(
    LogLevel.ERROR,
    `An error occurred while calling /wallet-instances endpoint: ${e}`,
  );

  if (!(e instanceof WalletProviderResponseError)) {
    throw e;
  }

  throw new ResponseErrorBuilder(WalletProviderResponseError)
    .handle(409, {
      code: WalletProviderResponseErrorCodes.WalletInstanceIntegrityFailed,
      message:
        "Unable to create a wallet instance with a device that failed the integrity check",
    })
    .handle("*", {
      code: WalletProviderResponseErrorCodes.WalletInstanceCreationFailed,
      message: "Unable to create wallet instance",
    })
    .buildFrom(e);
};
