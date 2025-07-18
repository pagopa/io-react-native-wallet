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
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import {
  getCredential,
  getCredentialStatusAssertion,
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
 * Type definition for the input of the {@link getCredentialStatusAssertionThunk}.
 */
type GetCredentialStatusAssertionThunkInput = {
  credentialType: SupportedCredentials;
  credential: Out<Credential.Issuance.ObtainCredential>["credential"];
  keyTag: string;
};

/**
 * Type definition for the output of the {@link getCredentialStatusAssertionThunk}.
 */
export type GetCredentialStatusAssertionThunkOutput = {
  statusAssertion: Out<Credential.Status.StatusAssertion>["statusAssertion"];
  parsedStatusAssertion: Out<Credential.Status.VerifyAndParseStatusAssertion>["parsedStatusAssertion"];
  credentialType: SupportedCredentials;
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
  return await getCredential({
    credentialIssuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
    redirectUri: REDIRECT_URI,
    // For simplicity, in the sample app, we assume that the `credentialType` corresponds to the `credentialId`,
    // and we restrict `getCredential` to issuing only one credential at a time.
    credentialId: credentialType,
    pid: pid,
    walletInstanceAttestation,
    wiaCryptoContext,
  });
});

/**
 * Thunk to obtain a credential status assertion.
 * @param args.credentialType - TThe type of credential for which you want to obtain the status assertion.
 * @returns The obtained credential result
 */
export const getCredentialStatusAssertionThunk = createAppAsyncThunk<
  GetCredentialStatusAssertionThunkOutput,
  GetCredentialStatusAssertionThunkInput
>("credential/statusAssertionGet", async (args, { getState }) => {
  const { credential, keyTag, credentialType } = args;

  // Create credential crypto context
  const credentialCryptoContext = createCryptoContextFor(keyTag);
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const env = getEnv(selectEnv(getState()));

  const issuerUrl =
    credentialType === "PersonIdentificationData"
      ? env.WALLET_PID_PROVIDER_BASE_URL
      : env.WALLET_EAA_PROVIDER_BASE_URL;

  return await getCredentialStatusAssertion(
    issuerUrl,
    credential,
    credentialCryptoContext,
    wiaCryptoContext,
    credentialType
  );
});
