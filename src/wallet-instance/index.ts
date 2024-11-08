import { getWalletProviderClient } from "../client";
import type { IntegrityContext } from "..";
import {
  ResponseErrorBuilder,
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

export async function revokeCurrentWalletInstance(context: {
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<void> {
  const api = getWalletProviderClient(context);

  await api.put("/wallet-instances/current/status", {
    body: { status: "REVOKED" },
  });
}
