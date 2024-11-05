import { getWalletProviderClient } from "../client";
import type { IntegrityContext } from "..";
import { WalletProviderResponseError } from "../utils/errors";
import * as Errors from "./errors";

export { Errors };

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
    throw new Errors.WalletInstanceCreationIntegrityError(
      "Unable to get an attestation for a Wallet Instance that failed the integrity check",
      e.claim,
      e.reason
    );
  }

  throw new Errors.WalletInstanceCreationError(
    `Unable to obtain wallet instance attestation [response status code: ${e.statusCode}]`,
    e.claim,
    e.reason
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
