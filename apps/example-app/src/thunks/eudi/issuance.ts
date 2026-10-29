import {
  createCryptoContextFor,
  Eudi,
} from "@io-app-it-wallet/io-react-native-wallet";
import { generate } from "@pagopa/io-react-native-crypto";
import { v4 as uuidv4 } from "uuid";

import type { EudiCredential } from "../../store/reducers/eudi/credentials";
import type { AppDispatch, RootState } from "../../store/types";

import { selectEudiLotes } from "../../store/reducers/eudi/trust";
import {
  selectEudiWalletAttestation,
  selectEudiWalletInstanceOrThrow,
  selectShouldRequestEudiWalletAttestation,
} from "../../store/reducers/eudi/walletAttestation";
import { deleteKeyIfExists, regenerateCryptoKey } from "../../utils/crypto";
import {
  EUDI_CLIENT_ID,
  EUDI_DPOP_KEYTAG,
  EUDI_REDIRECT_URI,
  EUDI_WIA_KEYTAG,
} from "../../utils/eudi";
import { openUrlAndListenForAuthRedirect } from "../../utils/openUrlAndListenForRedirect";
import { createAppAsyncThunk } from "../utils";
import {
  getEudiKeyAttestationThunk,
  getEudiWalletAttestationThunk,
} from "./walletAttestation";

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
 * or as a public client. With the Wallet Attestation, the credential key also has a Key Attestation.
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
  const lotes = selectEudiLotes(getState());

  const { authorizationCodeGrant, preAuthorizedCodeGrant } =
    CredentialOffer.extractGrantDetails(offer);
  // Without grants, the Authorization Code Flow is still possible if the Authorization Server supports it
  // (OpenID4VCI 1.0, Section 4.1.1), which is checked when starting the user authorization
  if (!authorizationCodeGrant && preAuthorizedCodeGrant) {
    throw new Error(
      "The Pre-Authorized Code Flow is not supported, the credential offer must have an authorization_code grant",
    );
  }

  const clientAuthentication = await getClientAuthentication(
    clientAuthenticationType,
    getState,
    dispatch,
  );

  const { authorizationServerMetadata, issuerMetadata } =
    await CredentialIssuance.fetchMetadata(offer.credential_issuer, {
      authorizationServer: authorizationCodeGrant?.authorizationServer,
    });

  // This is already enforced at the start of the credential offer flow
  /*   await CredentialIssuance.evaluateIssuerTrust({
    issuerMetadataJwt,
    wrpacLote: lotes.EUWRPACProvidersList,
    wrprcLote: lotes.EUWRPRCProvidersList
  }); */

  const { authUrl, codeVerifier, state } =
    await CredentialIssuance.startUserAuthorization({
      authorizationServerMetadata,
      clientAuthentication,
      credentialConfigurationId,
      issuerMetadata,
      issuerState: authorizationCodeGrant?.issuerState,
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

  // With the Wallet Attestation, the credential key is attested by the Wallet Provider as required by HAIP
  const keyTag = uuidv4();
  const keyAttestation =
    clientAuthenticationType === "attestation"
      ? await dispatch(getEudiKeyAttestationThunk(keyTag)).unwrap()
      : await generate(keyTag).then(() => undefined);

  const { credentials, format } = await CredentialIssuance.obtainCredential({
    accessToken,
    clientAuthentication,
    credentialConfigurationId,
    credentialCryptoContext: createCryptoContextFor(keyTag),
    dPopCryptoContext,
    issuerMetadata,
    keyAttestation,
  });

  const [credential] = credentials;
  if (!format) {
    throw new Error(`Unknown format for ${credentialConfigurationId}`);
  }

  await CredentialIssuance.verifyCredential({
    credential,
    credentialConfigurationId,
    format,
    issuerMetadata,
    lotes,
  });

  return {
    credential,
    credentialConfigurationId,
    display: CredentialIssuance.getCredentialDisplay(
      issuerMetadata,
      credentialConfigurationId,
    ),
    format,
    isSignatureVerified: true, // verifyCredential throws, so here the signature is valid
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
  // The EUDI Wallet Attestation, from the EUDI Wallet Provider
  selectEudiWalletInstanceOrThrow(getState());
  if (selectShouldRequestEudiWalletAttestation(getState())) {
    await dispatch(getEudiWalletAttestationThunk()).unwrap();
  }
  const walletAttestation = selectEudiWalletAttestation(getState());
  if (!walletAttestation) {
    throw new Error("Wallet Attestation not found");
  }
  return {
    cryptoContext: createCryptoContextFor(EUDI_WIA_KEYTAG),
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
