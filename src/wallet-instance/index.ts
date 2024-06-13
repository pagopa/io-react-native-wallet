import { type CryptoContext } from "@pagopa/io-react-native-jwt";
import { getWalletProviderClient } from "../client";
import { getAttestation } from "../wallet-instance-attestation/issuing";
import { type IntegrityContext } from "..";
import { WalletInstanceAttestationIssuingError } from "../utils/errors";

export enum WalletInstanceRecordState {
  REGISTERED,
  REVOKED,
  NOT_FOUND,
}

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

/**
 * Returns the remote state of the Wallet Instance, i.e. the Wallet Instance Record state.
 * This is useful to know whether the instance was revoked or registered.
 * @returns The Wallet Instance Record state
 */
export async function getRemoteWalletInstanceState(context: {
  wiaCryptoContext: CryptoContext;
  integrityContext: IntegrityContext;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}): Promise<WalletInstanceRecordState> {
  try {
    // Try to get an attestation. The state of the wallet instance
    // is determined by the HTTP status code of the attestation request.
    await getAttestation(context);
  } catch (e) {
    if (e instanceof WalletInstanceAttestationIssuingError) {
      if (e.statusCode === 403) return WalletInstanceRecordState.REVOKED;
      if (e.statusCode === 404) return WalletInstanceRecordState.NOT_FOUND;
    }

    // Rethrow unexpected errors so the caller can handle them
    throw e;
  }

  return WalletInstanceRecordState.REGISTERED;
}
