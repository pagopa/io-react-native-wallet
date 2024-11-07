import { generate } from "@pagopa/io-react-native-crypto";
import {
  createCryptoContextFor,
  Credential,
  WalletInstanceAttestation,
} from "@pagopa/io-react-native-wallet";
import uuid from "react-native-uuid";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import { selectPidFlowParams } from "../store/reducers/pid";
import type {
  PidAuthMethods,
  PidResult,
  SupportedCredentials,
} from "../store/types";
import { DPOP_KEYTAG, regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import { getAttestationThunk } from "./attestation";
import { createAppAsyncThunk } from "./utils";

// This can be any URL, as long as it has http or https as its protocol, otherwise it cannot be managed by the webview.
// PUT ME IN UTILS OR ENV
export const CIE_L3_REDIRECT_URI = "https://cie.callback";

/**
 * Type definition for the input of the {@link preparePidFlowParamsThunk}.
 */
type PreparePidFlowParamsThunkInput = {
  idpHint: string;
  authMethod: PidAuthMethods;
  credentialType: Extract<SupportedCredentials, "PersonIdentificationData">;
  ciePin?: string;
};

/**
 * Type definition for the input of the {@link ContinuePidFlowThunkInput}.
 */
type ContinuePidFlowThunkInput = {
  authRedirectUrl: string;
};

/**
 * Type definition for the output of the {@link preparePidFlowParamsThunk}.
 */
export type PreparePidFlowParamsThunkOutput = {
  authUrl: string;
  issuerConf: Awaited<
    ReturnType<typeof Credential.Issuance.evaluateIssuerTrust>
  >["issuerConf"];
  clientId: Awaited<
    ReturnType<typeof Credential.Issuance.startUserAuthorization>
  >["clientId"];
  codeVerifier: Awaited<
    ReturnType<typeof Credential.Issuance.startUserAuthorization>
  >["codeVerifier"];
  walletInstanceAttestation: Awaited<
    ReturnType<typeof WalletInstanceAttestation.getAttestation>
  >;
  credentialDefinition: Awaited<
    ReturnType<typeof Credential.Issuance.startUserAuthorization>
  >["credentialDefinition"];
  redirect_uri: string;
  ciePin?: string;
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
  PreparePidFlowParamsThunkOutput,
  PreparePidFlowParamsThunkInput
>("pid/flowParamsPrepare", async (args, { getState, dispatch }) => {
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
  const { idpHint, ciePin } = args;

  const isCie = args.idpHint.includes("servizicie") ? true : false;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env
  const env = selectEnv(getState());
  const { WALLET_PID_PROVIDER_BASE_URL, REDIRECT_URI } = getEnv(env);

  const redirect_uri = isCie ? CIE_L3_REDIRECT_URI : REDIRECT_URI;

  // Start the issuance flow
  const startFlow: Credential.Issuance.StartFlow = () => ({
    issuerUrl: WALLET_PID_PROVIDER_BASE_URL,
    credentialType: "PersonIdentificationData",
  });

  const { issuerUrl, credentialType } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
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
        redirectUri: redirect_uri,
        wiaCryptoContext,
        appFetch,
      }
    );

  // Obtain the Authorization URL
  const { authUrl } = await Credential.Issuance.buildAuthorizationUrl(
    issuerRequestUri,
    clientId,
    issuerConf,
    idpHint
  );

  return {
    authUrl,
    issuerConf,
    clientId,
    codeVerifier,
    walletInstanceAttestation,
    credentialDefinition,
    redirect_uri,
    ciePin,
  };
});

/**
 * Thunk to continue the CIE L3 issuance flow. Follows {@link preparePidFlowParamsThunk}.
 * It performs the last steps of the issuance flow, obtaining the credential and parsing it.
 * @param args.authRedirectUrl The URL of the webview after the user authorization which contains the authorization code.
 * @return The credetial result.
 */
export const continuePidFlowThunk = createAppAsyncThunk<
  PidResult,
  ContinuePidFlowThunkInput
>("pid/flowContinue", async (args, { getState }) => {
  const { authRedirectUrl } = args;

  const flowParams = selectPidFlowParams(getState());

  if (!flowParams) {
    throw new Error("Flow params not found");
  }

  const {
    issuerConf,
    clientId,
    codeVerifier,
    walletInstanceAttestation,
    credentialDefinition,
    redirect_uri,
  } = flowParams;

  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithQueryMode(
      authRedirectUrl
    );

  /*
   * Create wia crypto context, we are using the same keytag used in {@link prepareCieL3FlowParamsThunk},
   * hoping it has not been deleted in the meanwhile. This can be improved later.
   */
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

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
    clientId,
    redirect_uri,
    codeVerifier,
    {
      walletInstanceAttestation,
      wiaCryptoContext,
      dPopCryptoContext,
      appFetch,
    }
  );

  const { credential, format } = await Credential.Issuance.obtainCredential(
    issuerConf,
    accessToken,
    clientId,
    credentialDefinition,
    {
      credentialCryptoContext,
      dPopCryptoContext,
      appFetch,
    }
  );

  const { parsedCredential } =
    await Credential.Issuance.verifyAndParseCredential(
      issuerConf,
      credential,
      format,
      { credentialCryptoContext }
    );

  return {
    parsedCredential,
    credential,
    keyTag: credentialKeyTag,
    credentialType: "PersonIdentificationData",
  };
});
