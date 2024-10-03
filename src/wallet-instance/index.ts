import { getWalletProviderClient } from "../client";
import type { IntegrityContext } from "..";
import {
  WalletInstanceCreationError,
  WalletInstanceCreationIntegrityError,
  WalletProviderResponseError,
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
