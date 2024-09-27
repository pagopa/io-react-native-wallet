import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import { selectAttestation } from "../store/reducers/attestation";
import { selectEnv } from "../store/reducers/environment";
import { selectPid } from "../store/reducers/pid";
import type {
  CredentialResult,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import {
  getCredential,
  getCredentialStatusAttestation,
} from "../utils/credential";
import { WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import { createAppAsyncThunk } from "./utils";

/**
 * Type definition for the input of the {@link getCredentialThunk}.
 */
type GetCredentialThunkInput = {
  credentialType: SupportedCredentialsWithoutPid;
};

/**
 * Type definition for the input of the {@link getCredentialStatusAttestationThunk}.
 */
type GetCredentialStatusAttestationThunkInput = {
  credentialType: SupportedCredentialsWithoutPid;
  credential: Awaited<
    ReturnType<Credential.Issuance.ObtainCredential>
  >["credential"];
  keyTag: string;
};

/**
 * Type definition for the output of the {@link getCredentialStatusAttestationThunk}.
 */
type GetCredentialStatusAttestationThunkOutput = {
  statusAttestation: string;
  credentialType: SupportedCredentialsWithoutPid;
};

/**
 * Thunk to obtain a new credential.
 * @param args.idPhint- The idPhint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 * @param args.credentialType - The type of the requested credential to obtain
 * @returns The obtained credential result
 */
export const getCredentialThunk = createAppAsyncThunk<
  CredentialResult,
  GetCredentialThunkInput
>("credential/credentialGet", async (args, { getState }) => {
  const walletInstanceAttestation = selectAttestation(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env URLs
  const env = selectEnv(getState());
  const { WALLET_EAA_PROVIDER_BASE_URL, REDIRECT_URI } = getEnv(env);

  const { credentialType } = args;

  // Get the PID from the store
  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }
  const pidCryptoContext = createCryptoContextFor(pid.keyTag);
  return await getCredential({
    credentialIssuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
    redirectUri: REDIRECT_URI,
    credentialType,
    walletInstanceAttestation,
    wiaCryptoContext,
    pid: pid.credential,
    pidCryptoContext,
  });
});

/**
 * Thunk to obtain a credential status attestation.
 * @param args.credentialType - TThe type of credential for which you want to obtain the status attestation.
 * @returns The obtained credential result
 */
export const getCredentialStatusAttestationThunk = createAppAsyncThunk<
  GetCredentialStatusAttestationThunkOutput,
  GetCredentialStatusAttestationThunkInput
>("credential/statusAttestationGet", async (args, { getState }) => {
  const { credential, keyTag, credentialType } = args;

  // Create credential crypto context
  const credentialCryptoContext = createCryptoContextFor(keyTag);

  const env = selectEnv(getState());
  const { WALLET_EAA_PROVIDER_BASE_URL } = getEnv(env);

  return await getCredentialStatusAttestation(
    WALLET_EAA_PROVIDER_BASE_URL,
    credential,
    credentialCryptoContext,
    credentialType
  );
});
