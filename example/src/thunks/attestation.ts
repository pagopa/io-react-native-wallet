import {
  WalletInstanceAttestation,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { WALLET_PROVIDER_BASE_URL } from "@env";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { getIntegrityContext } from "../utils/integrity";
import { regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { selectInstanceKeyTag } from "../store/reducers/instance";

/**
 * Thunk to obtain a new Wallet Instance Attestation.
 */
export const getAttestationThunk = createAppAsyncThunk(
  "walletinstance/attestation",
  async (_, { getState }) => {
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
  }
);