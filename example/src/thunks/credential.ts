import { generate } from "@pagopa/io-react-native-crypto";
import {
  createCryptoContextFor,
  CredentialIssuance,
  CredentialOffer,
  CredentialStatus,
  IoWallet,
} from "@pagopa/io-react-native-wallet";

import type { StatusSupportedTokens } from "../store/reducers/credential";
import type {
  CredentialResult,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";

import {
  selectWalletInstanceAttestationAsJwt,
  shouldRequestWalletInstanceAttestationSelector,
} from "../store/reducers/attestation";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectPid } from "../store/reducers/pid";
import {
  getCredential,
  getCredentialStatusAssertion,
  getCredentialStatusFromStatusList,
} from "../utils/credential";
import { WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import {
  getWalletInstanceAttestationThunk,
  getWalletUnitAttestationThunk,
} from "./attestation";
import { createAppAsyncThunk } from "./utils";

/**
 * Discriminated union representing the unified credential status result,
 * covering both status assertion and status list flows.
 */
export type CredentialStatusResult =
  | {
      credentialType: StatusSupportedTokens;
      rawStatus: string;
      status: string;
      statusList: CredentialStatus.StatusList;
      type: "status_list";
    }
  | {
      credentialType: SupportedCredentials;
      parsedStatusAssertion: CredentialStatus.ParsedStatusAssertion;
      status: string;
      statusAssertion: string;
      type: "status_assertion";
    };

/**
 * Type definition for the input of the {@link getCredentialStatusAssertionThunk}.
 */
interface GetCredentialStatusAssertionThunkInput {
  credential: string;
  credentialType: SupportedCredentials;
  format: CredentialIssuance.CredentialFormat;
  keyTag: string;
}

/**
 * Type definition for the input of the {@link getCredentialStatusListThunk}.
 */
interface GetCredentialStatusListThunkInput {
  credential: string;
  credentialType: StatusSupportedTokens;
  format: CredentialIssuance.CredentialFormat;
}

/**
 * Type definition for the input of the {@link getCredentialThunk}.
 */
interface GetCredentialThunkInput {
  batchSize?: number;
  credentialOffer?: CredentialOffer.CredentialOffer;
  credentialType: SupportedCredentialsWithoutPid;
}

/**
 * Thunk to obtain a new credential.
 * @param args.idPhint- The idPhint for the Identity Provider to use if the requested credential is a `PersonIdentificationData`
 * @param args.credentialType - The type of the requested credential to obtain
 * @param args.credentialOffer - (optional) A resolved credential offer. When provided, the issuer URL
 *   and the authorization parameters (authorization server, scope, issuer state) are taken from it, and
 *   the offer is validated against the resolved Issuer metadata before starting the issuance.
 * @returns The obtained credential result
 */
export const getCredentialThunk = createAppAsyncThunk<
  CredentialResult,
  GetCredentialThunkInput
>("credential/credentialGet", async (args, { dispatch, getState }) => {
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
  const { REDIRECT_URI, WALLET_EAA_PROVIDER_BASE_URL, WALLET_TA_BASE_URL } =
    getEnv(env);

  const { batchSize, credentialOffer, credentialType } = args;

  // Get the PID from the store
  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }

  const generateKeysWithAttestation = async (
    credentialKeyTags: string[],
  ): Promise<string | undefined> => {
    if (wallet.WalletUnitAttestation.isSupported) {
      const wua = await dispatch(
        getWalletUnitAttestationThunk({ keyTags: credentialKeyTags }),
      ).unwrap();
      return wua.attestation;
    }
    await Promise.all(credentialKeyTags.map(generate));
    return undefined;
  };

  // When the issuance originates from a credential offer, the issuer URL comes
  // from the offer and overrides the default EAA provider. The authorization_code
  // grant may also carry a specific authorization server (required when the Issuer
  // relies on more than one), as well as the `scope` and `issuer_state` to be
  // forwarded to the PAR.
  const issuerUrl = credentialOffer
    ? credentialOffer.credential_issuer
    : WALLET_EAA_PROVIDER_BASE_URL.value(itwVersion);

  const authorizationCodeGrant = credentialOffer
    ? wallet.CredentialsOffer.extractGrantDetails(credentialOffer)
        .authorizationCodeGrant
    : undefined;

  // Evaluate issuer trust, selecting the authorization server from the offer
  // when present.
  const { issuerConf } = await wallet.CredentialIssuance.evaluateIssuerTrust(
    issuerUrl,
    {
      appFetch,
      authorizationServer: authorizationCodeGrant?.authorizationServer,
    },
  );

  // Validate the credential offer against the resolved Issuer metadata. Only
  // performed when the issuance was started from a credential offer.
  if (credentialOffer) {
    await wallet.CredentialsOffer.validateCredentialOffer({
      credentialIssuerMetadata: issuerConf.authorization_servers
        ? { authorization_servers: issuerConf.authorization_servers }
        : {},
      offer: credentialOffer,
    });
  }

  return await getCredential({
    batchSize,
    // For simplicity, in the sample app, we assume that the `credentialType` corresponds to the `credentialId`,
    // and we restrict `getCredential` to issuing only one credential at a time.
    credentialId: credentialType,
    generateKeysWithAttestation,
    issuerConf,
    issuerState: authorizationCodeGrant?.issuerState,
    itwVersion,
    pid: pid,
    redirectUri: REDIRECT_URI,
    scope: authorizationCodeGrant?.scope,
    trustAnchorUrl: WALLET_TA_BASE_URL,
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
  CredentialStatusResult,
  GetCredentialStatusAssertionThunkInput
>("credential/statusAssertionGet", async (args, { getState }) => {
  const { credential, credentialType, format, keyTag } = args;

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
    credentialType,
  );

  return {
    credentialType: result.credentialType,
    parsedStatusAssertion: result.parsedStatusAssertion,
    status: result.parsedStatusAssertion.credential_status_type,
    statusAssertion: result.statusAssertion,
    type: "status_assertion",
  };
});

/**
 * Thunk to obtain a credential status from its Token Status List.
 */
export const getCredentialStatusListThunk = createAppAsyncThunk<
  CredentialStatusResult,
  GetCredentialStatusListThunkInput
>("credential/statusListGet", async (args, { getState }) => {
  const itwVersion = selectItwVersion(getState());

  const result = await getCredentialStatusFromStatusList(
    itwVersion,
    getEnv(selectEnv(getState())),
    args.credential,
    args.credentialType,
    args.format,
  );

  return {
    credentialType: args.credentialType,
    rawStatus: result.rawStatus,
    status: result.status,
    statusList: result.statusList,
    type: "status_list",
  };
});
