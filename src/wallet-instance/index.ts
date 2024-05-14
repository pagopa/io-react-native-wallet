import type { IntegrityContext } from "..";
import { hasStatus } from "../utils/misc";

export async function createWalletInstance(context: {
  integrityContext: IntegrityContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}) {
  const { integrityContext, walletProviderBaseUrl, appFetch = fetch } = context;

  //1. getNonce
  const nonceUrl = `${walletProviderBaseUrl}/nonce`;
  const challenge = await appFetch(nonceUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(hasStatus(200))
    .then((res) => res.json())
    .then((result) => result.nonce);

  const key_attestation = await integrityContext.getAttestation(challenge);
  const hardware_key_tag = integrityContext.getHardwareKeyTag();

  //2. createWalletInstance
  const walletInstanceUrl = `${walletProviderBaseUrl}/wallet-instance`;
  const createdWalletInstance = await appFetch(walletInstanceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-iowallet-user-id": "92562d4c-c857-4afe-a4ce-ad2e0e119395",
    },
    body: JSON.stringify({
      challenge,
      key_attestation,
      hardware_key_tag,
    }),
  }).then(hasStatus(204));

  return createdWalletInstance;
}
