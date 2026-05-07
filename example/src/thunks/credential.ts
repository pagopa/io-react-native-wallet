import {
  createCryptoContextFor,
  CredentialIssuance,
  CredentialStatus,
  IoWallet,
} from "@pagopa/io-react-native-wallet";
import { generate } from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";
import {
  selectWalletInstanceAttestationAsJwt,
  shouldRequestWalletInstanceAttestationSelector,
} from "../store/reducers/attestation";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import type {
  CredentialResult,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import {
  getCredential,
  getCredentialStatusAssertion,
  getCredentialStatus,
} from "../utils/credential";
import { WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import { selectPid } from "../store/reducers/pid";
import { createAppAsyncThunk } from "./utils";
import {
  getWalletInstanceAttestationThunk,
  getWalletUnitAttestationThunk,
} from "./attestation";

/**
 * Discriminated union representing the unified credential status result,
 * covering both status assertion and status list flows.
 */
export type CredentialStatusResult =
  | {
      type: "status_assertion";
      status: string;
      credentialType: SupportedCredentials;
      statusAssertion: string;
      parsedStatusAssertion: CredentialStatus.ParsedStatusAssertion;
    }
  | {
      type: "status_list";
      status: string;
      credentialType: SupportedCredentials;
      statusList: string;
      statusBit: number;
    };

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
  credential: string;
  format: CredentialIssuance.CredentialFormat;
  keyTag: string;
};

/**
 * Type definition for the input of the {@link getCredentialStatusListThunk}.
 */
type GetCredentialStatusListThunkInput = {
  credential: string;
  credentialType: SupportedCredentials;
  format: CredentialIssuance.CredentialFormat;
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
  if (shouldRequestWalletInstanceAttestationSelector(getState())) {
    await dispatch(getWalletInstanceAttestationThunk());
  }

  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation =
    selectWalletInstanceAttestationAsJwt(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // Get env URLs
  const env = selectEnv(getState());
  const { WALLET_EAA_PROVIDER_BASE_URL, REDIRECT_URI, WALLET_TA_BASE_URL } =
    getEnv(env);

  const { credentialType } = args;

  // Get the PID from the store
  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }

  // Create credential crypto context and get the WUA if supported
  const credentialKeyTag = uuidv4().toString();
  let walletUnitAttestation: string | undefined;

  if (wallet.WalletUnitAttestation.isSupported) {
    const wua = await dispatch(
      getWalletUnitAttestationThunk({ keyTags: [credentialKeyTag] })
    ).unwrap();
    walletUnitAttestation = wua.attestation;
  } else {
    await generate(credentialKeyTag);
  }

  return await getCredential({
    itwVersion,
    credentialIssuerUrl: WALLET_EAA_PROVIDER_BASE_URL.value(itwVersion),
    trustAnchorUrl: WALLET_TA_BASE_URL,
    redirectUri: REDIRECT_URI,
    // For simplicity, in the sample app, we assume that the `credentialType` corresponds to the `credentialId`,
    // and we restrict `getCredential` to issuing only one credential at a time.
    credentialId: credentialType,
    credentialKeyTag,
    pid: pid,
    walletInstanceAttestation,
    walletUnitAttestation,
    wiaCryptoContext,
  });
});

/**
 * Thunk to obtain a credential status assertion.
 * @param args.credentialType - TThe type of credential for which you want to obtain the status assertion.
 * @returns The obtained credential result
 */
export const getCredentialStatusAssertionThunk = createAppAsyncThunk<
  CredentialStatusResult,
  GetCredentialStatusAssertionThunkInput
>("credential/statusAssertionGet", async (args, { getState }) => {
  const { credential, format, keyTag, credentialType } = args;

  // Create credential crypto context
  const credentialCryptoContext = createCryptoContextFor(keyTag);
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  const env = getEnv(selectEnv(getState()));
  const itwVersion = selectItwVersion(getState());

  const issuerUrl =
    credentialType === "PersonIdentificationData"
      ? env.WALLET_PID_PROVIDER_BASE_URL
      : env.WALLET_EAA_PROVIDER_BASE_URL;

  const result = await getCredentialStatusAssertion(
    itwVersion,
    issuerUrl.value(itwVersion),
    credential,
    format,
    credentialCryptoContext,
    wiaCryptoContext,
    credentialType
  );

  return {
    type: "status_assertion",
    status: result.parsedStatusAssertion.credential_status_type,
    credentialType: result.credentialType,
    statusAssertion: result.statusAssertion,
    parsedStatusAssertion: result.parsedStatusAssertion,
  };
});

export const getCredentialStatusListThunk = createAppAsyncThunk<
  CredentialStatusResult,
  GetCredentialStatusListThunkInput
>("credential/statusListGet", async (args, { getState }) => {
  const itwVersion = selectItwVersion(getState());

  const env = getEnv(selectEnv(getState()));

  const issuerUrl =
    args.credentialType === "PersonIdentificationData"
      ? env.WALLET_PID_PROVIDER_BASE_URL
      : env.WALLET_EAA_PROVIDER_BASE_URL;

  const result = await getCredentialStatus(
    itwVersion,
    args.credential,
    args.format,
    issuerUrl.value(itwVersion)
  );

  return {
    type: "status_list",
    status: result.status,
    credentialType: args.credentialType,
    statusList: result.statusList,
    statusBit: result.statusBit,
  };
});
