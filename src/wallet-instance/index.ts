import { getWalletProviderClient } from "../client";
import type { IntegrityContext } from "..";
import {
  WalletProviderResponseError,
  WalletProviderResponseErrorCodes,
} from "../utils/errors";

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
    throw new WalletProviderResponseError(
      WalletProviderResponseErrorCodes.WalletInstanceIntegrityFailed, // Code
      "Unable to create a wallet instance with a device that failed the integrity check", // Message
      e.reason, // Reason
      e.statusCode // Status code
    );
  }

  throw new WalletProviderResponseError(
    WalletProviderResponseErrorCodes.WalletInstanceCreation, // Code
    `Unable to create wallet instance`, // Message
    e.reason, // Reason
    e.statusCode // Status code
  );
};

export async function revokeCurrentWalletInstance(context: {
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<void> {
  const api = getWalletProviderClient(context);

  await api.put("/wallet-instances/current/status", {
    body: { status: "REVOKED" },
  });
}
