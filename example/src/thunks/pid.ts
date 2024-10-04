import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import type {
  PidAuthMethods,
  PidResult,
  SupportedCredentials,
} from "../store/types";
import { getPid } from "../utils/credential";
import { WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import { createAppAsyncThunk } from "./utils";
import { getAttestationThunk } from "./attestation";

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
    // Checks if the wallet instance attestation needs to be reuqested
    if (shouldRequestAttestationSelector(getState())) {
      await dispatch(getAttestationThunk());
    }

    // Gets the Wallet Instance Attestation from the persisted store
    const walletInstanceAttestation = selectAttestation(getState());
    if (!walletInstanceAttestation) {
      throw new Error("Wallet Instance Attestation not found");
    }

    const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

    // Get env URLs
    const env = selectEnv(getState());
    const { WALLET_PID_PROVIDER_BASE_URL, REDIRECT_URI } = getEnv(env);

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
