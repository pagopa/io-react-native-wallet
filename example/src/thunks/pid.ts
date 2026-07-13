import { generate } from "@pagopa/io-react-native-crypto";
import {
  createCryptoContextFor,
  CredentialIssuance,
  IoWallet,
} from "@pagopa/io-react-native-wallet";
import { v4 as uuidv4 } from "uuid";

import {
  selectWalletInstanceAttestationAsJwt,
  shouldRequestWalletInstanceAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectPidFlowParams } from "../store/reducers/pid";
import { type PidAuthMethods, type PidResult } from "../store/types";
import { DPOP_KEYTAG, regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import {
  getWalletInstanceAttestationThunk,
  getWalletUnitAttestationThunk,
} from "./attestation";
import { createAppAsyncThunk } from "./utils";

// This can be any URL, as long as it has http or https as its protocol, otherwise it cannot be managed by the webview.
// PUT ME IN UTILS OR ENV
export const CIE_L3_REDIRECT_URI = "https://cie.callback";

/**
 * Type definition for the output of the {@link preparePidFlowParamsThunk}.
 */
export interface PreparePidFlowParamsThunkOutput {
  authMethod: PidAuthMethods;
  authUrl: string;
  ciePin?: string;
  clientId: string;
  codeVerifier: string;
  credentialDefinition: Awaited<
    ReturnType<CredentialIssuance.IssuanceApi["startUserAuthorization"]>
  >["credentialDefinition"];
  issuerConf: CredentialIssuance.IssuerConfig;
  redirectUri: string;
  walletInstanceAttestation: string;
}

/**
 * Type definition for the input of the {@link ContinuePidFlowThunkInput}.
 */
interface ContinuePidFlowThunkInput {
  authRedirectUrl: string;
}

/**
 * Type definition for the input of the {@link preparePidFlowParamsThunk}.
 */
interface PreparePidFlowParamsThunkInput {
  authMethod: PidAuthMethods;
  ciePin?: string;
  idpHint: string;
  withMRTDPoP?: boolean;
}

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
>("pid/flowParamsPrepare", async (args, { dispatch, getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

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
  const { authMethod, ciePin, idpHint, withMRTDPoP } = args;

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env
  const env = selectEnv(getState());
  const { REDIRECT_URI, WALLET_PID_PROVIDER_BASE_URL } = getEnv(env);

  const redirectUri =
    args.authMethod === "cieL3" ? CIE_L3_REDIRECT_URI : REDIRECT_URI;

  // Evaluate issuer trust
  const { issuerConf } = await wallet.CredentialIssuance.evaluateIssuerTrust(
    WALLET_PID_PROVIDER_BASE_URL.value(itwVersion),
    { appFetch },
  );

  // Start user authorization
  const { clientId, codeVerifier, credentialDefinition, issuerRequestUri } =
    await wallet.CredentialIssuance.startUserAuthorization(
      issuerConf,
      [getPidSdJwtConfigurationId(issuerConf)],
      withMRTDPoP
        ? { idpHinting: idpHint, proofType: "mrtd-pop" }
        : { proofType: "none" },
      {
        appFetch,
        redirectUri: redirectUri,
        walletInstanceAttestation,
        wiaCryptoContext,
      },
    );

  // Obtain the Authorization URL
  const { authUrl } = await wallet.CredentialIssuance.buildAuthorizationUrl(
    issuerRequestUri,
    clientId,
    issuerConf,
    idpHint,
  );

  return {
    authMethod,
    authUrl,
    ciePin,
    clientId,
    codeVerifier,
    credentialDefinition,
    issuerConf,
    redirectUri,
    walletInstanceAttestation,
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
>("pid/flowContinue", async (args, { dispatch, getState }) => {
  const { authRedirectUrl } = args;

  const env = selectEnv(getState());
  const { X509_CERT_ROOT } = getEnv(env);
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  const flowParams = selectPidFlowParams(getState());

  if (!flowParams) {
    throw new Error("Flow params not found");
  }

  const {
    clientId,
    codeVerifier,
    credentialDefinition,
    issuerConf,
    redirectUri,
    walletInstanceAttestation,
  } = flowParams;

  const { code } =
    await wallet.CredentialIssuance.completePidUserAuthorizationWithQueryMode(
      authRedirectUrl,
    );

  /*
   * Create wia crypto context, we are using the same keytag used in {@link prepareCieL3FlowParamsThunk},
   * hoping it has not been deleted in the meanwhile. This can be improved later.
   */
  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Create DPoP context for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await wallet.CredentialIssuance.authorizeAccess(
    issuerConf,
    code,
    redirectUri,
    codeVerifier,
    {
      appFetch,
      dPopCryptoContext,
      walletInstanceAttestation,
      wiaCryptoContext,
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

  // Create credential crypto context and get the WUA if supported
  const credentialKeyTag = uuidv4().toString();
  let walletUnitAttestation: string | undefined;

  if (wallet.WalletUnitAttestation.isSupported) {
    const wua = await dispatch(
      getWalletUnitAttestationThunk({ keyTags: [credentialKeyTag] }),
    ).unwrap();
    walletUnitAttestation = wua.attestation;
  } else {
    await generate(credentialKeyTag);
  }

  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

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
        credentialCryptoContext,
        dPopCryptoContext,
        walletUnitAttestation,
      },
    );

  const { parsedCredential } =
    await wallet.CredentialIssuance.verifyAndParseCredential(
      issuerConf,
      credential,
      credential_configuration_id,
      { credentialCryptoContext, ignoreMissingAttributes: true },
      X509_CERT_ROOT,
    );

  return {
    credential,
    credentialConfigurationId: credential_configuration_id,
    credentialType: "PersonIdentificationData",
    format,
    keyTag: credentialKeyTag,
    parsedCredential,
  };
});

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
      c.format === "dc+sd-jwt" && /PersonIdentificationData|pid/i.test(c.scope),
  );
  return result!.at(0) as string;
}
