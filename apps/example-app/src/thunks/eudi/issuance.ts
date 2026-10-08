import {
  createCryptoContextFor,
  Eudi,
} from "@io-app-it-wallet/io-react-native-wallet";
import { generate } from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";

import type { EudiCredential } from "../../store/reducers/eudi/credentials";
import type { AppDispatch, RootState } from "../../store/types";

import {
  selectWalletInstanceAttestationAsJwt,
  shouldRequestWalletInstanceAttestationSelector,
} from "../../store/reducers/attestation";
import { selectHasInstanceKeyTag } from "../../store/selectors/instance";
import {
  deleteKeyIfExists,
  regenerateCryptoKey,
  WIA_KEYTAG,
} from "../../utils/crypto";
import {
  EUDI_CLIENT_ID,
  EUDI_DPOP_KEYTAG,
  EUDI_REDIRECT_URI,
} from "../../utils/eudi";
import { openUrlAndListenForAuthRedirect } from "../../utils/openUrlAndListenForRedirect";
import { getWalletInstanceAttestationThunk } from "../attestation";
import { createAppAsyncThunk } from "../utils";

/** How the wallet authenticates to the EUDI Authorization Servers */
export type EudiClientAuthentication = "attestation" | "public";

export interface ObtainEudiCredentialThunkInput {
  clientAuthentication: EudiClientAuthentication;
  credentialConfigurationId: string;
  offer: Eudi.CredentialOffer.CredentialOffer;
}

/**
 * Thunk to obtain an EUDI Wallet credential with the Issuer-initiated Authorization Code Flow
 * (OpenID4VCI 1.0 with the HAIP profile), separate from the IT-Wallet issuance.
 *
 * The wallet authenticates as requested: with its Wallet Attestation, as required by HAIP,
 * or as a public client.
 */
export const obtainEudiCredentialThunk = createAppAsyncThunk<
  EudiCredential,
  ObtainEudiCredentialThunkInput
>("eudi/credentialObtain", async (args, { dispatch, getState }) => {
  const {
    clientAuthentication: clientAuthenticationType,
    credentialConfigurationId,
    offer,
  } = args;
  const { CredentialIssuance, CredentialOffer } = Eudi;

  const { authorizationCodeGrant } = CredentialOffer.extractGrantDetails(offer);
  if (!authorizationCodeGrant) {
    throw new Error(
      "The credential offer does not support the Authorization Code Flow",
    );
  }

  const clientAuthentication = await getClientAuthentication(
    clientAuthenticationType,
    getState,
    dispatch,
  );

  const { authorizationServerMetadata, issuerMetadata } =
    await CredentialIssuance.fetchMetadata(offer.credential_issuer, {
      authorizationServer: authorizationCodeGrant.authorizationServer,
    });

  const { authUrl, codeVerifier, state } =
    await CredentialIssuance.startUserAuthorization({
      authorizationServerMetadata,
      clientAuthentication,
      credentialConfigurationId,
      issuerMetadata,
      issuerState: authorizationCodeGrant.issuerState,
      redirectUri: EUDI_REDIRECT_URI,
    });

  // The user authenticates to the issuer in the browser
  const { authRedirectUrl } = await openUrlAndListenForAuthRedirect(
    EUDI_REDIRECT_URI,
    authUrl,
  );

  const { code } = CredentialIssuance.completeUserAuthorization(
    authRedirectUrl,
    { authorizationServerMetadata, state },
  );

  await regenerateCryptoKey(EUDI_DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(EUDI_DPOP_KEYTAG);

  const accessToken = await CredentialIssuance.authorizeAccess({
    authorizationServerMetadata,
    clientAuthentication,
    code,
    codeVerifier,
    dPopCryptoContext,
    redirectUri: EUDI_REDIRECT_URI,
  });

  const keyTag = uuidv4();
  await generate(keyTag);

  const { credentials, format } = await CredentialIssuance.obtainCredential({
    accessToken,
    clientAuthentication,
    credentialConfigurationId,
    credentialCryptoContext: createCryptoContextFor(keyTag),
    dPopCryptoContext,
    issuerMetadata,
  });

  const [credential] = credentials;
  if (!format) {
    throw new Error(`Unknown format for ${credentialConfigurationId}`);
  }

  return {
    credential,
    credentialConfigurationId,
    display: CredentialIssuance.getCredentialDisplay(
      issuerMetadata,
      credentialConfigurationId,
    ),
    format,
    issuer: offer.credential_issuer,
    keyTag,
    obtainedAt: new Date().toISOString(),
  };
});

const getClientAuthentication = async (
  type: EudiClientAuthentication,
  getState: () => RootState,
  dispatch: AppDispatch,
): Promise<Eudi.CredentialIssuance.ClientAuthentication> => {
  if (type === "public") {
    return { clientId: EUDI_CLIENT_ID, type: "public" };
  }
  if (!selectHasInstanceKeyTag(getState())) {
    throw new Error(
      "A wallet instance is required to authenticate with the Wallet Attestation",
    );
  }
  if (shouldRequestWalletInstanceAttestationSelector(getState())) {
    await dispatch(getWalletInstanceAttestationThunk()).unwrap();
  }
  const walletAttestation = selectWalletInstanceAttestationAsJwt(getState());
  if (!walletAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }
  return {
    cryptoContext: createCryptoContextFor(WIA_KEYTAG),
    type: "attestation",
    walletAttestation,
  };
};

/**
 * Thunk to delete an EUDI Wallet credential together with the key it is bound to.
 * @returns The key tag of the deleted credential
 */
export const deleteEudiCredentialThunk = createAppAsyncThunk<string, string>(
  "eudi/credentialDelete",
  async (keyTag) => {
    await deleteKeyIfExists(keyTag);
    return keyTag;
  },
);
