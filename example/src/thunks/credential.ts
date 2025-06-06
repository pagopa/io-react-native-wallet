import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import {
  selectAttestationAsJwt,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { selectEnv } from "../store/reducers/environment";
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
import { selectPid } from "../store/reducers/pid";
import type { Out } from "src/utils/misc";
import { createAppAsyncThunk } from "./utils";
import { getAttestationThunk } from "./attestation";

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
  credential: Out<Credential.Issuance.ObtainCredential>["credential"];
  keyTag: string;
};

/**
 * Type definition for the output of the {@link getCredentialStatusAttestationThunk}.
 */
export type GetCredentialStatusAttestationThunkOutput = {
  statusAttestation: Out<Credential.Status.StatusAttestation>["statusAttestation"];
  parsedStatusAttestation: Out<Credential.Status.VerifyAndParseStatusAttestation>["parsedStatusAttestation"];
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
>("credential/credentialGet", async (args, { getState, dispatch }) => {
  // Checks if the wallet instance attestation needs to be reuqested
  if (shouldRequestAttestationSelector(getState())) {
    await dispatch(getAttestationThunk());
  }

  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation = selectAttestationAsJwt(getState());
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
