import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";
import {
  selectAttestationAsJwt,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import type {
  PidAuthMethods,
  PidResult,
  SupportedCredentials,
} from "../store/types";
import { getPidCieID } from "../utils/credential";
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

// TODO: Refactor this function to use the same two-step process as CIE + PIN and SPID (Jira Task ID: SIW-1840)
/**
 * Thunk to obtain PID with CieID auth method.
 * @param args.idpHint- The idpHint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 * @param args.credentialType - The type of the requested credential to obtain
 * @returns The obtained credential result
 */
export const getPidCieIDThunk = createAppAsyncThunk<
  PidResult,
  GetPidThunkInput
>("cieID/pidGet", async (args, { getState, dispatch }) => {
  // Checks if the wallet instance attestation needs to be reuqested
  if (shouldRequestAttestationSelector(getState())) {
    await dispatch(getAttestationThunk({ apiVersion: "0.7.1" }));
  }

  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation = selectAttestationAsJwt(getState());
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
  return await getPidCieID({
    pidIssuerUrl: WALLET_PID_PROVIDER_BASE_URL,
    redirectUri: REDIRECT_URI,
    idpHint,
    walletInstanceAttestation,
    wiaCryptoContext,
    credentialType,
  });
});
