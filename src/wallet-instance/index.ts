import { getWalletProviderClient } from "../client";
import {
  ResponseErrorBuilder,
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../utils/errors";
import type { WalletInstanceData } from "../client/generated/wallet-provider";
import type { IntegrityContext } from "..";
import { DebugLevel, Logger } from "../utils/logging";

export async function createWalletInstance(context: {
  integrityContext: IntegrityContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}) {
  const { integrityContext } = context;
  const api = getWalletProviderClient(context);

  //1. Obtain nonce
  const challenge = await api.get("/nonce").then((response) => response.nonce);

  Logger.log(
    DebugLevel.DEBUG,
    `Challenge ${challenge} obtained from ${context.walletProviderBaseUrl}`
  );

  const keyAttestation = await integrityContext.getAttestation(challenge);

  const hardwareKeyTag = integrityContext.getHardwareKeyTag();

  Logger.log(
    DebugLevel.DEBUG,
    `Key attestation extracted from the device for hardware key tag ${hardwareKeyTag} - ${keyAttestation} `
  );

  //2. Create Wallet Instance
  await api
    .post("/wallet-instances", {
      body: {
        challenge,
        key_attestation: keyAttestation,
        hardware_key_tag: hardwareKeyTag,
      },
    })
    .catch(handleCreateWalletInstanceError);

  return hardwareKeyTag;
}

const handleCreateWalletInstanceError = (e: unknown) => {
  Logger.log(
    DebugLevel.ERROR,
    `An error occurred while calling /wallet-instances endpoint: ${e}`
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

/**
 * Revoke a Wallet Instance by ID.
 * @param context.id The Wallet Instance ID. It matches the hardware key tag used for creation.
 */
export async function revokeWalletInstance(context: {
  id: string;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<void> {
  const api = getWalletProviderClient(context);

  await api.put("/wallet-instances/{id}/status", {
    path: { id: context.id },
    body: { status: "REVOKED" },
  });
}

/**
 * Get the status of a Wallet Instance by ID.
 * @param context.id The Wallet Instance ID. It matches the hardware key tag used for creation.
 * @returns Details on the status of the Wallet Instance
 */
export async function getWalletInstanceStatus(context: {
  id: string;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<WalletInstanceData> {
  const api = getWalletProviderClient(context);

  return api.get("/wallet-instances/{id}/status", {
    path: { id: context.id },
  });
}

/**
 * Get the status of the current Wallet Instance.
 * @returns Details on the status of the current Wallet Instance
 */
export async function getCurrentWalletInstanceStatus(context: {
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<WalletInstanceData> {
  const api = getWalletProviderClient(context);

  return api.get("/wallet-instances/current/status");
}
