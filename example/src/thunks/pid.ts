import {
  WalletInstanceAttestation,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { createAppAsyncThunk } from "./utils";
import { selectInstanceKeyTag } from "../store/reducers/instance";
import { getIntegrityContext } from "../utils/integrity";
import { credentialReset } from "../store/reducers/credential";
import type {
  PidAuthMethods,
  PidResult,
  SupportedCredentials,
} from "../store/types";
import { getPid } from "../utils/credential";
import { selectEnv } from "../store/reducers/environment";
import { getEnv } from "../utils/environment";

/**
 * Type definition for the input of the {@link getCredentialThunk}.
 */
type GetPidThunkInput = {
  idpHint: string;
  authMethod: PidAuthMethods;
  credentialType: Extract<SupportedCredentials, "PersonIdentificationData">;
};

/**
 * Thunk to obtain a new credential.
 * @param args.idPhint- The idPhint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 * @param args.credentialType - The type of the requested credential to obtain
 * @returns The obtained credential result
 */
export const getPidThunk = createAppAsyncThunk<PidResult, GetPidThunkInput>(
  "pid/pidGet",
  async (args, { getState, dispatch }) => {
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
    const {
      WALLET_PROVIDER_BASE_URL,
      WALLET_PID_PROVIDER_BASE_URL,
      REDIRECT_URI,
    } = getEnv(env);
    /**
     * Obtains a new Wallet Instance Attestation.
     * WARNING: The integrity context must be the same used when creating the Wallet Instance with the same keytag.
     */
    const walletInstanceAttestation =
      await WalletInstanceAttestation.getAttestation({
        wiaCryptoContext,
        integrityContext,
        walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
        appFetch,
      });

    const { idpHint, credentialType } = args;
    // Resets the credential state before obtaining a new PID
    dispatch(credentialReset());
    return await getPid({
      pidIssuerUrl: WALLET_PID_PROVIDER_BASE_URL,
      redirectUri: REDIRECT_URI,
      idpHint,
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType,
    });
  }
);
