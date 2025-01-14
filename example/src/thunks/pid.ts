import { generate } from "@pagopa/io-react-native-crypto";
import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import uuid from "react-native-uuid";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import type { PidResult, SupportedCredentials } from "../store/types";
import { DPOP_KEYTAG, regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import appFetch from "../utils/fetch";
import { getAttestationThunk } from "./attestation";
import { createAppAsyncThunk } from "./utils";
import {
  openAuthenticationSession,
  supportsInAppBrowser,
} from "@pagopa/io-react-native-login-utils";
import { REDIRECT_URI, WALLET_PID_PROVIDER_BASE_URL } from "@env";

/**
 * Type definition for the input of the {@link preparePidFlowParamsThunk}.
 */
type PreparePidFlowParamsThunkInput = {
  idpHint: string;
  credentialType: Extract<
    SupportedCredentials,
    "eu.europa.ec.eudi.pid_jwt_vc_json"
  >;
};

/**
 * Thunk to prepare the parameters for the PID issuance flow.
 * It performs a partial issuance flow, starting from the issuance request to the user authorization.
 * This is needed to obtain the needed parameters to continue the flow in the webview in {@link TestCieL3Scenario} or in {@link PidSpidLoginScreen}.
 * The flow can be managed using either SPID or CIE L3 as the authentication method.
 * @param args.idpHint The identity provider hint to use in the issuance flow.
 * @param args.authMethod The authentication method to use, either SPID or CIE L3.
 * @param args.credentialType The type of credential to be issued.
 * @param args.ciePin The CIE PIN to use in the issuance flow (optional, only for CIE L3).
 * @returns The needed parameters to continue the issuance flow.
 */
export const preparePidFlowParamsThunk = createAppAsyncThunk<
  PidResult,
  PreparePidFlowParamsThunkInput
>("pid/flowParamsPrepare", async (args, { getState, dispatch }) => {
  try {
    // Checks if the wallet instance attestation needs to be reuqested
    if (shouldRequestAttestationSelector(getState())) {
      await dispatch(getAttestationThunk());
    }

    // Gets the Wallet Instance Attestation from the persisted store
    const walletInstanceAttestation = selectAttestation(getState());
    if (!walletInstanceAttestation) {
      throw new Error("Wallet Instance Attestation not found");
    }

    // Reset the credential state before obtaining a new PID
    dispatch(credentialReset());

    const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

    // Start the issuance flow
    const startFlow: Credential.Issuance.StartFlow = () => ({
      issuerUrl: WALLET_PID_PROVIDER_BASE_URL,
      credentialType: "eu.europa.ec.eudi.pid_jwt_vc_json",
    });

    const { issuerUrl, credentialType } = startFlow();

    // Evaluate issuer trust
    const { issuerConf } = await Credential.Issuance.getIssuerConfig(
      issuerUrl,
      { appFetch }
    );

    // Start user authorization
    const { issuerRequestUri, clientId, codeVerifier, credentialDefinition } =
      await Credential.Issuance.startUserAuthorization(
        issuerConf,
        credentialType,
        {
          walletInstanceAttestation,
          redirectUri: REDIRECT_URI,
          wiaCryptoContext,
          appFetch,
        }
      );

    // Obtain the Authorization URL
    const { authUrl } = await Credential.Issuance.buildAuthorizationUrl(
      issuerRequestUri,
      issuerConf
    );

    const supportsCustomTabs = await supportsInAppBrowser();
    if (!supportsCustomTabs) {
      throw new Error("Custom tabs are not supported");
    }

    const baseRedirectUri = new URL(REDIRECT_URI).protocol.replace(":", "");

    // Open the authorization URL in the custom tab
    const authRedirectUrl = await openAuthenticationSession(
      authUrl,
      baseRedirectUri
    );

    const { code } =
      await Credential.Issuance.completeUserAuthorizationWithQueryMode(
        authRedirectUrl
      );

    // Create credential crypto context
    const credentialKeyTag = uuid.v4().toString();
    await generate(credentialKeyTag);
    const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

    // Create DPoP context for the whole issuance flow
    await regenerateCryptoKey(DPOP_KEYTAG);
    const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

    const { accessToken } = await Credential.Issuance.authorizeAccess(
      issuerConf,
      code,
      REDIRECT_URI,
      codeVerifier,
      clientId,
      {
        walletInstanceAttestation,
        wiaCryptoContext,
        dPopCryptoContext,
        appFetch,
      }
    );

    const { credential } = await Credential.Issuance.obtainCredential(
      issuerConf,
      accessToken,
      clientId,
      credentialDefinition,
      {
        credentialCryptoContext,
        appFetch,
      }
    );

    console.log(credential);

    const { parsedCredential } =
      await Credential.Issuance.verifyAndParseCredential(
        issuerConf,
        credential,
        credentialDefinition.format,
        { credentialCryptoContext }
      );

    console.log(parsedCredential);

    return {
      parsedCredential,
      credential,
      keyTag: credentialKeyTag,
      credentialType: "eu.europa.ec.eudi.pid_jwt_vc_json",
    };
  } catch (e) {
    console.log(e);
    console.log(JSON.stringify(e));
  }
});
