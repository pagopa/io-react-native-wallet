import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import type {
  PidAuthMethods,
  SupportedCredentials,
} from "../store/types";
import { startUserAuthorizationTest } from "../utils/credential";
import { WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import { createAppAsyncThunk } from "./utils";
import { getAttestationThunk } from "./attestation";

/**
 * Type definition for the input of the {@link startUserAuthorizationThunk}.
 */
type StartUserAuthorizationThunkInput = {
  idpHint: string;
  authMethod: PidAuthMethods;
  credentialType: Extract<SupportedCredentials, "PersonIdentificationData">;
};

/**
 * Thunk to start the user authorization process.
 * @param args.idPhint - The idPhint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 * @param args.credentialType - The type of the requested credential to obtain
 * @returns The authorization URL and other necessary data
 */
export const startUserAuthorizationThunk = createAppAsyncThunk<
  { authUrl: string; issuerConf: any; clientId: string; codeVerifier: string; credentialDefinition: any },
  StartUserAuthorizationThunkInput
>(
  "pid/startUserAuthorization",
  async (args, { getState, dispatch }) => {
    // Checks if the wallet instance attestation needs to be requested
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
    return await startUserAuthorizationTest({
      pidIssuerUrl: WALLET_PID_PROVIDER_BASE_URL,
      redirectUri: REDIRECT_URI,
      idpHint,
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType,
    });
  }
);
