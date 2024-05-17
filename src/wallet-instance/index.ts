import { getWalletProviderClient } from "../client";
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
  await api.post("/wallet-instances", {
    body: {
      challenge,
      key_attestation: keyAttestation,
      hardware_key_tag: hardwareKeyTag,
    },
  });

  return hardwareKeyTag;
}
