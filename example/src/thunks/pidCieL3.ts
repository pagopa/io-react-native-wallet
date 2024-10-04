import { generate } from "@pagopa/io-react-native-crypto";
import {
  createCryptoContextFor,
  Credential,
  WalletInstanceAttestation,
} from "@pagopa/io-react-native-wallet";
import parseUrl from "parse-url";
import uuid from "react-native-uuid";
import {
  selectAttestation,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import { credentialReset } from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import { selectPidCieL3FlowParams } from "../store/reducers/pid";
import type { PidResult } from "../store/types";
import { DPOP_KEYTAG, regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import appFetch from "../utils/fetch";
import { getAttestationThunk } from "./attestation";
import { createAppAsyncThunk } from "./utils";

// This can be any URL, as long as it has http or https as its protocol, otherwise it cannot be managed by the webview.
// PUT ME IN UTILS OR ENV
export const CIE_L3_REDIRECT_URI = "https://cie.callback";

/**
 * Type definition for the input of the {@link prepareCieL3FlowParamsThunk}.
 */
type PrepareCieL3FlowParamsThunkInput = {
  idpHint: string;
  ciePin: string;
};

/**
 * Type definition for the input of the {@link ContinueCieL3FlowThunkInput}.
 */
type ContinueCieL3FlowThunkInput = {
  url: string;
};

/**
 * Type definition for the output of the {@link prepareCieL3FlowParamsThunk}.
 */
export type PrepareCieL3FlowParamsThunkOutput = {
  cieAuthUrl: string;
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
  ciePin: string;
};

/**
 * Thunk to prepare the parameters for the CIE L3 issuance flow.
 * It performs a partial issuance flow, starting from the issuance request to the user authorization.
 * This is needed to obtain the needed parameters to continue the flow in the webview in {@link TestCieL3Scenario}.
 * @param args.idpHint The identity provider hint to use in the issuance flow.
 * @param args.ciePin The CIE PIN to use in the issuance flow.
 * @returns The needed parameters to continue the issuance flow.
 */
export const prepareCieL3FlowParamsThunk = createAppAsyncThunk<
  PrepareCieL3FlowParamsThunkOutput,
  PrepareCieL3FlowParamsThunkInput
>("ciel3/flowParamsPrepare", async (args, { getState, dispatch }) => {
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

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Get env
  const env = selectEnv(getState());
  const { WALLET_PID_PROVIDER_BASE_URL } = getEnv(env);

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
        redirectUri: CIE_L3_REDIRECT_URI,
        wiaCryptoContext,
        appFetch,
      }
    );

  const authzRequestEndpoint =
    issuerConf.oauth_authorization_server.authorization_endpoint;

  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: issuerRequestUri,
    idphint: idpHint,
  });

  return {
    cieAuthUrl: `${authzRequestEndpoint}?${params}`,
    issuerConf,
    clientId,
    codeVerifier,
    walletInstanceAttestation,
    credentialDefinition,
    ciePin,
  };
});

/**
 * Thunk to continue the CIE L3 issuance flow. Follows {@link prepareCieL3FlowParamsThunk}.
 * It performs the last steps of the issuance flow, obtaining the credential and parsing it.
 * @param args.url The URL of the webview after the user authorization which contains the authorization code.
 * @return The credetial result.
 */
export const continueCieL3FlowThunk = createAppAsyncThunk<
  PidResult,
  ContinueCieL3FlowThunkInput
>("ciel3/flowContinue", async (args, { getState }) => {
  const flowParams = selectPidCieL3FlowParams(getState());
  if (!flowParams) {
    throw new Error("Flow params not found");
  }
  const {
    issuerConf,
    clientId,
    codeVerifier,
    walletInstanceAttestation,
    credentialDefinition,
  } = flowParams;

  const query = parseUrl(args.url).query;

  const { code } = Credential.Issuance.parseAuthroizationResponse(query);

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
    CIE_L3_REDIRECT_URI,
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
