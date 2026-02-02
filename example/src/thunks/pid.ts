import { generate } from "@pagopa/io-react-native-crypto";
import {
  IoWallet,
  createCryptoContextFor,
  CredentialIssuance,
} from "@pagopa/io-react-native-wallet";
import { v4 as uuidv4 } from "uuid";
import {
  selectAttestationAsJwt,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectPidFlowParams } from "../store/reducers/pid";
import { type PidAuthMethods, type PidResult } from "../store/types";
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
  ciePin?: string;
  withMRTDPoP?: boolean;
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
  authMethod: PidAuthMethods;
  authUrl: string;
  issuerConf: CredentialIssuance.IssuerConfig;
  clientId: string;
  codeVerifier: string;
  walletInstanceAttestation: string;
  credentialDefinition: Awaited<
    ReturnType<CredentialIssuance.IssuanceApi["startUserAuthorization"]>
  >["credentialDefinition"];
  redirectUri: string;
  ciePin?: string;
};

/**
 * Thunk to prepare the parameters for the PID issuance flow.
 * It performs a partial issuance flow, starting from the issuance request to the user authorization.
 * This is needed to obtain the needed parameters to continue the flow in the webview in {@link TestCieL3Scenario} or in {@link PidSpidLoginScreen}.
 * The flow can be managed using either SPID or CIE L3 as the authentication method.
 * @param args.idpHint The identity provider hint to use in the issuance flow.
 * @param args.authMethod The authentication method to use, either SPID or CIE L3.
 * @param args.ciePin The CIE PIN to use in the issuance flow (optional, only for CIE L3).
 * @param args.withMRTDPoP Whether MRTD PoP is required (optional, only for L2+).
 * @returns The needed parameters to continue the issuance flow.
 */
export const preparePidFlowParamsThunk = createAppAsyncThunk<
  PreparePidFlowParamsThunkOutput,
  PreparePidFlowParamsThunkInput
>("pid/flowParamsPrepare", async (args, { getState, dispatch }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // Checks if the wallet instance attestation needs to be reuqested
  if (shouldRequestAttestationSelector(getState())) {
    await dispatch(getAttestationThunk());
  }

  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation = selectAttestationAsJwt(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  // Reset the credential state before obtaining a new PID
  dispatch(credentialReset());
  const { authMethod, idpHint, ciePin, withMRTDPoP } = args;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env
  const env = selectEnv(getState());
  const { WALLET_PID_PROVIDER_BASE_URL, REDIRECT_URI } = getEnv(env);

  const redirectUri =
    args.authMethod === "cieL3" ? CIE_L3_REDIRECT_URI : REDIRECT_URI;

  // Evaluate issuer trust
  const { issuerConf } = await wallet.CredentialIssuance.evaluateIssuerTrust(
    WALLET_PID_PROVIDER_BASE_URL,
    { appFetch }
  );

  // Start user authorization
  const { issuerRequestUri, clientId, codeVerifier, credentialDefinition } =
    await wallet.CredentialIssuance.startUserAuthorization(
      issuerConf,
      ["dc_sd_jwt_PersonIdentificationData"],
      withMRTDPoP
        ? { proofType: "mrtd-pop", idpHinting: idpHint }
        : { proofType: "none" },
      {
        walletInstanceAttestation,
        redirectUri: redirectUri,
        wiaCryptoContext,
        appFetch,
      }
    );

  // Obtain the Authorization URL
  const { authUrl } = await wallet.CredentialIssuance.buildAuthorizationUrl(
    issuerRequestUri,
    clientId,
    issuerConf,
    idpHint
  );

  return {
    authMethod,
    authUrl,
    issuerConf,
    clientId,
    codeVerifier,
    walletInstanceAttestation,
    credentialDefinition,
    redirectUri,
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

  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

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
    redirectUri,
  } = flowParams;

  const { code } =
    await wallet.CredentialIssuance.completeUserAuthorizationWithQueryMode(
      authRedirectUrl
    );

  /*
   * Create wia crypto context, we are using the same keytag used in {@link prepareCieL3FlowParamsThunk},
   * hoping it has not been deleted in the meanwhile. This can be improved later.
   */
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Create credential crypto context
  const credentialKeyTag = uuidv4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Create DPoP context for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await wallet.CredentialIssuance.authorizeAccess(
    issuerConf,
    code,
    clientId,
    redirectUri,
    codeVerifier,
    {
      walletInstanceAttestation,
      wiaCryptoContext,
      dPopCryptoContext,
      appFetch,
    }
  );

  const [pidCredentialDefinition] = credentialDefinition;
  // Get the credential configuration ID for PID
  const pidCredentialConfigId =
    pidCredentialDefinition?.type === "openid_credential" &&
    pidCredentialDefinition?.credential_configuration_id;

  const { credential_configuration_id, credential_identifiers } =
    accessToken.authorization_details.find(
      (authDetails) =>
        authDetails.credential_configuration_id === pidCredentialConfigId
    ) ?? {};

  // Get the first credential_identifier from the access token's authorization details
  const [credential_identifier] = credential_identifiers ?? [];

  if (!credential_configuration_id) {
    throw new Error("No credential configuration ID found for PID");
  }

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
        credentialCryptoContext,
        dPopCryptoContext,
        appFetch,
      }
    );

  const { parsedCredential } =
    await wallet.CredentialIssuance.verifyAndParseCredential(
      issuerConf,
      credential,
      credential_configuration_id,
      { credentialCryptoContext, ignoreMissingAttributes: true }
    );

  return {
    parsedCredential,
    credential,
    keyTag: credentialKeyTag,
    credentialType: "PersonIdentificationData",
    credentialConfigurationId: credential_configuration_id,
    format,
  };
});
