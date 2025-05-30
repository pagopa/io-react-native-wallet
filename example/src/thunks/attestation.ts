import {
  WalletInstanceAttestation,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { getIntegrityContext } from "../utils/integrity";
import { regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { selectInstanceKeyTag } from "../store/reducers/instance";
import { selectEnv } from "../store/reducers/environment";
import { getEnv } from "../utils/environment";

type GetAttestationThunkInput = { apiVersion: "0.7.1" | "1.0" }; // TODO: [SIW-2111] Remove after transition to v1.0
type GetAttestationThunkOutput = Awaited<
  ReturnType<typeof WalletInstanceAttestation.getAttestation>
>;

/**
 * Thunk to obtain a new Wallet Instance Attestation.
 */
export const getAttestationThunk = createAppAsyncThunk<
  GetAttestationThunkOutput,
  GetAttestationThunkInput
>("walletinstance/attestation", async (args, { getState }) => {
  // Retrieve the integrity key tag from the store and create its context
  const integrityKeyTag = selectInstanceKeyTag(getState());
  if (!integrityKeyTag) {
    throw new Error("Integrity key not found");
  }
  const integrityContext = getIntegrityContext(integrityKeyTag);

  // generate Key for Wallet Instance Attestation
  // ensure the key esists befor starting the issuing process
  await regenerateCryptoKey(WIA_KEYTAG);
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env URLs
  const env = selectEnv(getState());
  const { WALLET_PROVIDER_BASE_URL } = getEnv(env);

  // TODO: [SIW-2111] Remove after transition to v1.0
  if (args.apiVersion === "0.7.1") {
    const issuingAttestation =
      await WalletInstanceAttestation.deprecatedGetAttestation({
        wiaCryptoContext,
        integrityContext,
        walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
        appFetch,
      });
    return [{ format: "jwt", wallet_attestation: issuingAttestation }];
  }

  /**
   * Obtains a new Wallet Instance Attestation.
   * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
   */
  const issuingAttestation = await WalletInstanceAttestation.getAttestation({
    wiaCryptoContext,
    integrityContext,
    walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
    appFetch,
  });
  return issuingAttestation;
});
