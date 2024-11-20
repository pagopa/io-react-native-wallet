import { getWalletProviderClient } from "../client";
import {
  WalletInstanceCreationError,
  WalletInstanceCreationIntegrityError,
  WalletProviderResponseError,
} from "../utils/errors";
import type { WalletInstanceData } from "../client/generated/wallet-provider";
import type { IntegrityContext } from "..";

export async function createWalletInstance(context: {
  integrityContext: IntegrityContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}) {
  const { integrityContext } = context;

  const api = getWalletProviderClient(context);

  //1. Obtain nonce
  const challenge = await api.get("/nonce").then((response) => response.nonce);

  const keyAttestation = await integrityContext.getAttestation(challenge);
  const hardwareKeyTag = integrityContext.getHardwareKeyTag();

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
  if (!(e instanceof WalletProviderResponseError)) {
    throw e;
  }

  if (e.statusCode === 409) {
    throw new WalletInstanceCreationIntegrityError(
      "Unable to get an attestation for a Wallet Instance that failed the integrity check",
      e.claim,
      e.reason
    );
  }

  throw new WalletInstanceCreationError(
    `Unable to obtain wallet instance attestation [response status code: ${e.statusCode}]`,
    e.claim,
    e.reason
  );
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
