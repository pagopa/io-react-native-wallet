import type {
  CredentialResult,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import { getCredential } from "../utils/credential";
import { createAppAsyncThunk } from "./utils";
import { REDIRECT_URI, WALLET_EAA_PROVIDER_BASE_URL } from "@env";

/**
 * Type definition for the input of the {@link getCredentialThunk}.
 */
type GetCredentialThunkInput = {
  credentialType: SupportedCredentialsWithoutPid;
};

/**
 * Type definition for the output of the {@link getCredentialStatusAttestationThunk}.
 */
export type GetCredentialStatusAttestationThunkOutput = {
  credentialType: SupportedCredentialsWithoutPid;
};

/**
 * Thunk to obtain a new credential.
 * @param args.credentialType - The type of the requested credential to obtain
 * @returns The obtained credential result
 */
export const getCredentialThunk = createAppAsyncThunk<
  CredentialResult,
  GetCredentialThunkInput
>("credential/credentialGet", async (args, _) => {
  // Gets the Wallet Instance Attestation from the persisted store

  const { credentialType } = args;

  // Get the PID from the store
  return await getCredential({
    credentialIssuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
    redirectUri: REDIRECT_URI,
    credentialType,
  });
});
