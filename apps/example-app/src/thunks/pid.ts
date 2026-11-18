import {
  CredentialIssuance,
  IoWallet,
} from "@io-app-it-wallet/io-react-native-wallet";
import * as WebBrowser from "expo-web-browser";

import {
  selectWalletInstanceAttestationAsJwt,
  shouldRequestWalletInstanceAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectXUserId } from "../store/reducers/user";
import {
  type AppDispatch,
  type PidResult,
  type RootState,
} from "../store/types";
import {
  createLocalSignerFor,
  DPOP_KEYTAG,
  regenerateCryptoKey,
  WIA_KEYTAG,
} from "../utils/crypto";
import { isAndroid } from "../utils/device";
import { getEnv, ITW_VERSION } from "../utils/environment";
import appFetch from "../utils/fetch";
import { requestRemotePin } from "../utils/pinPrompt";
import { createRemoteSignerFor, enrollRemoteKey } from "../utils/remoteCrypto";
import {
  getKeyAttestationThunk,
  getWalletInstanceAttestationThunk,
} from "./attestation";
import { createAppAsyncThunk } from "./utils";

/**
 * Thunk to obtain the PID.
 * It drives the whole issuance flow: the user authorization is performed in an authentication session of the system browser,
 * which redirects back to the app with the authorization code used to obtain and parse the credential.
 * The credential key is enrolled on the Remote WSCD through the Wallet Provider, using the PIN set in the Settings.
 * @returns The PID result.
 */
export const getPidThunk = createAppAsyncThunk<PidResult, undefined>(
  "pid/get",
  async (_, { dispatch, getState }) => {
    // Asked before opening the browser, as a modal can't be presented right after it is dismissed
    const remotePin = await requestRemotePin();
    const wallet = new IoWallet({ version: ITW_VERSION });

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

    // Reset the credential state before obtaining a new PID
    dispatch(credentialReset());

    const wiaSigner = createLocalSignerFor(WIA_KEYTAG);

    // Get env
    const { REDIRECT_URI: redirectUri, WALLET_PID_PROVIDER_BASE_URL } =
      getEnv();

    // Evaluate issuer trust
    const { issuerConf } = await wallet.CredentialIssuance.evaluateIssuerTrust(
      WALLET_PID_PROVIDER_BASE_URL,
      { appFetch },
    );

    // Start user authorization
    const { clientId, codeVerifier, credentialDefinition, issuerRequestUri } =
      await wallet.CredentialIssuance.startUserAuthorization(
        issuerConf,
        [getPidSdJwtConfigurationId(issuerConf)],
        { proofType: "none" },
        {
          appFetch,
          redirectUri,
          walletInstanceAttestation,
          wiaSigner,
        },
      );

    // Obtain the Authorization URL
    const { authUrl } = await wallet.CredentialIssuance.buildAuthorizationUrl(
      issuerRequestUri,
      clientId,
      issuerConf,
    );

    // On Android check that there is a browser to open the authentication session and warm it up
    if (isAndroid) {
      const { browserPackages } =
        await WebBrowser.getCustomTabsSupportingBrowsersAsync();
      if (browserPackages.length === 0) {
        throw new Error("No browser found to open the authentication session");
      }
      await WebBrowser.warmUpAsync();
    }

    // Perform the user authorization in the browser, which returns when it redirects to the redirect URI scheme
    const baseRedirectUri = `${new URL(redirectUri).protocol}//`;
    const authResult = await WebBrowser.openAuthSessionAsync(
      authUrl,
      baseRedirectUri,
      { createTask: false, preferEphemeralSession: true },
    );
    if (authResult.type !== "success" || !authResult.url) {
      throw new Error("Authorization flow was not completed successfully.");
    }
    const authRedirectUrl = authResult.url;

    const { code } =
      await wallet.CredentialIssuance.completePidUserAuthorizationWithQueryMode(
        authRedirectUrl,
      );

    // Create DPoP context for the whole issuance flow
    await regenerateCryptoKey(DPOP_KEYTAG);
    const dPopSigner = createLocalSignerFor(DPOP_KEYTAG);

    const { accessToken } = await wallet.CredentialIssuance.authorizeAccess(
      issuerConf,
      code,
      redirectUri,
      codeVerifier,
      {
        appFetch,
        dPopSigner,
        walletInstanceAttestation,
        wiaSigner,
      },
    );

    const [pidCredentialDefinition] = credentialDefinition;
    // Get the credential configuration ID for PID
    const pidCredentialConfigId =
      pidCredentialDefinition?.type === "openid_credential" &&
      pidCredentialDefinition?.credential_configuration_id;

    const { credential_configuration_id, credential_identifiers } =
      accessToken.authorization_details.find(
        (authDetails) =>
          authDetails.credential_configuration_id === pidCredentialConfigId,
      ) ?? {};

    // Get the first credential_identifier from the access token's authorization details
    const [credential_identifier] = credential_identifiers ?? [];

    if (!credential_configuration_id) {
      throw new Error("No credential configuration ID found for PID");
    }

    // Create credential signer and get the WUA
    const { credentialSigner, keyAttestation, remoteKey } =
      await prepareRemoteCredentialKey(dispatch, getState(), remotePin);

    // Get the credential identifier that was authorized
    const { credential, format } =
      await wallet.CredentialIssuance.obtainCredential(
        issuerConf,
        accessToken,
        clientId,
        {
          credential_configuration_id,
          credential_identifier,
        },
        {
          appFetch,
          credentialSigner,
          dPopSigner,
          keyAttestation,
        },
      );

    const { parsedCredential } =
      await wallet.CredentialIssuance.verifyAndParseCredential(
        issuerConf,
        credential,
        credential_configuration_id,
        {
          credentialSigner,
          ignoreMissingAttributes: true,
        },
      );

    return {
      credential,
      credentialConfigurationId: credential_configuration_id,
      credentialType: "PersonIdentificationData",
      format,
      parsedCredential,
      remoteKey,
    };
  },
);

/**
 * Enroll the credential key on the Remote WSCD and obtain its Key Attestation, using the KEC as evidence.
 * The enrolled key is returned to be persisted along with the credential.
 */
const prepareRemoteCredentialKey = async (
  dispatch: AppDispatch,
  state: RootState,
  remotePin: string,
) => {
  const context = {
    walletProviderBaseUrl: getEnv().WALLET_PROVIDER_BASE_URL,
    xUserId: selectXUserId(state),
  };
  const remoteKey = await enrollRemoteKey(remotePin, context);
  const credentialSigner = createRemoteSignerFor(remoteKey, remotePin, context);
  const { attestation: keyAttestation } = await dispatch(
    getKeyAttestationThunk({
      keysToAttest: [{ attestation: remoteKey.kec, signer: credentialSigner }],
    }),
  ).unwrap();
  return { credentialSigner, keyAttestation, remoteKey };
};

/**
 * Get the credential configuration ID for the PID in sd-jwt format.
 * Different versions of IT-Wallet may use different naming conventions for the PID.
 * @param issuerConf The issuer configuration obtained from the {@link evaluateIssuerTrust}
 * @returns The PID configuration ID to use for issuance
 */
function getPidSdJwtConfigurationId(
  issuerConf: CredentialIssuance.IssuerConfig,
) {
  const result = Object.entries(
    issuerConf.credential_configurations_supported,
  ).find(
    ([, c]) =>
      c.format === "dc+sd-jwt" &&
      /PersonIdentificationData|pid|eid/i.test(c.scope),
  );
  return result?.at(0) as string;
}
