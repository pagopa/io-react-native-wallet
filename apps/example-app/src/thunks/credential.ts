import {
  CredentialIssuance,
  CredentialOffer,
  CredentialStatus,
  IoWallet,
} from "@io-app-it-wallet/io-react-native-wallet";

import type { StatusSupportedTokens } from "../store/reducers/credential";
import type {
  CredentialResult,
  SupportedCredentialsWithoutPid,
} from "../store/types";

import {
  selectWalletInstanceAttestationAsJwt,
  shouldRequestWalletInstanceAttestationSelector,
} from "../store/reducers/attestation";
import { selectXUserId } from "../store/reducers/user";
import { selectPid } from "../store/selectors/pid";
import {
  getCredential,
  getCredentialStatusFromStatusList,
} from "../utils/credential";
import { createLocalSignerFor, WIA_KEYTAG } from "../utils/crypto";
import { getEnv, ITW_VERSION } from "../utils/environment";
import appFetch from "../utils/fetch";
import { requestRemotePin } from "../utils/pinPrompt";
import { createRemoteSignerFor } from "../utils/remoteCrypto";
import {
  getKeyAttestationThunk,
  getWalletInstanceAttestationThunk,
} from "./attestation";
import { createAppAsyncThunk } from "./utils";

/**
 * Credential status result obtained from the Token Status List.
 */
export interface CredentialStatusResult {
  credentialType: StatusSupportedTokens;
  rawStatus: string;
  status: string;
  statusList: CredentialStatus.StatusList;
  type: "status_list";
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

  const wiaSigner = createLocalSignerFor(WIA_KEYTAG);

  const wallet = new IoWallet({ version: ITW_VERSION });

  // Get env URLs
  const { REDIRECT_URI, WALLET_EAA_PROVIDER_BASE_URL } = getEnv();

  const { batchSize, credentialOffer, credentialType } = args;

  const offerApi = wallet.CredentialsOffer;

  // Get the PID from the store
  const pid = selectPid(getState());
  if (!pid) {
    throw new Error("PID not found");
  }

  const generateKeysWithAttestation = async (
    credentialKeyTags: string[],
  ): Promise<string | undefined> => {
    const ka = await dispatch(
      getKeyAttestationThunk({ keyTags: credentialKeyTags }),
    ).unwrap();
    return ka.attestation;
  };

  // When the issuance originates from a credential offer, the issuer URL comes
  // from the offer and overrides the default EAA provider. The authorization_code
  // grant may also carry a specific authorization server (required when the Issuer
  // relies on more than one), as well as the `scope` and `issuer_state` to be
  // forwarded to the PAR.
  const issuerUrl = credentialOffer
    ? credentialOffer.credential_issuer
    : WALLET_EAA_PROVIDER_BASE_URL;

  const authorizationCodeGrant = credentialOffer
    ? offerApi.extractGrantDetails(credentialOffer).authorizationCodeGrant
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
    await offerApi.validateCredentialOffer({
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
    pid: pid,
    pidSigner: createRemoteSignerFor(pid.remoteKey, await requestRemotePin(), {
      walletProviderBaseUrl: getEnv().WALLET_PROVIDER_BASE_URL,
      xUserId: selectXUserId(getState()),
    }),
    redirectUri: REDIRECT_URI,
    scope: authorizationCodeGrant?.scope,
    walletInstanceAttestation,
    wiaSigner,
  });
});

/**
 * Thunk to obtain a credential status from its Token Status List.
 */
export const getCredentialStatusListThunk = createAppAsyncThunk<
  CredentialStatusResult,
  GetCredentialStatusListThunkInput
>("credential/statusListGet", async (args) => {
  const result = await getCredentialStatusFromStatusList(
    getEnv(),
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
