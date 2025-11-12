import { generate } from "@pagopa/io-react-native-crypto";
import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import uuid from "react-native-uuid";
import { credentialReset } from "../store/reducers/credential";
import { DPOP_KEYTAG, regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import appFetch from "../utils/fetch";
import { getAttestationThunk } from "./attestation";
import { createAppAsyncThunk } from "./utils";
import {
  openAuthenticationSession,
  supportsInAppBrowser,
} from "@pagopa/io-react-native-login-utils";
import { PROD_REDIRECT_URI } from "@env";
import {
  selectAttestationAsJwt,
  shouldRequestAttestationSelector,
} from "../store/reducers/attestation";
import type { PidResult, SupportedCredentials } from "../store/types";

type getPidThunkInput = {
  credentialType: Extract<
    SupportedCredentials,
    "dc_sd_jwt_PersonIdentificationData" | "mso_mdoc_PersonIdentificationData"
  >;
};

/**
 * Thunk to obtain the Person Identification Data (PID) credential without user authentication.
 * This thunk handles the entire flow of obtaining the PID credential, including:
 * - Requesting the Wallet Instance Attestation if needed
 * - Starting the issuance flow
 * - Authorizing access
 * - Obtaining the credential
 * - Verifying and parsing the credential
 * It returns the parsed credential, the raw credential, the key tag used for encryption,
 * the credential type, and the format of the credential.
 */
export const getPidNoAuthThunk = createAppAsyncThunk<
  PidResult,
  getPidThunkInput
>(
  "pidNoAuth/flowParamsPrepare",
  async ({ credentialType }, { getState, dispatch }) => {
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

    const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

    // Start the issuance flow
    const startFlow: Credential.Issuance.StartFlow = () => ({
      issuerUrl: "https://io-d-itn-wallet-issuer-func-01.azurewebsites.net/",
      credentialId: credentialType,
    });

    const { issuerUrl, credentialId } = startFlow();

    // Evaluate issuer trust
    const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
      issuerUrl,
      { appFetch }
    );

    // Start user authorization
    const { issuerRequestUri, clientId, codeVerifier, credentialDefinition } =
      await Credential.Issuance.startUserAuthorization(
        issuerConf,
        [credentialId],
        {
          walletInstanceAttestation,
          redirectUri: PROD_REDIRECT_URI,
          wiaCryptoContext,
          appFetch,
        }
      );

    // Obtain the Authorization URL
    const { authUrl } = await Credential.Issuance.buildAuthorizationUrl(
      issuerRequestUri,
      clientId,
      issuerConf
    );

    const supportsCustomTabs = await supportsInAppBrowser();
    if (!supportsCustomTabs) {
      throw new Error("Custom tabs are not supported");
    }

    const baseRedirectUri = new URL("iowallet://cb").protocol.replace(":", "");

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
      clientId,
      PROD_REDIRECT_URI,
      codeVerifier,
      {
        walletInstanceAttestation,
        wiaCryptoContext,
        dPopCryptoContext,
        appFetch,
      }
    );

    const [pidCredentialDefinition] = credentialDefinition;

    const { credential_configuration_id, credential_identifiers } =
      accessToken.authorization_details.find(
        (authDetails) =>
          authDetails.credential_configuration_id ===
          pidCredentialDefinition?.credential_configuration_id
      ) ?? {};

    // Get the first credential_identifier from the access token's authorization details
    const [credential_identifier] = credential_identifiers ?? [];

    if (!credential_configuration_id) {
      throw new Error("No credential configuration ID found for PID");
    }

    const { credential, format } = await Credential.Issuance.obtainCredential(
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
      await Credential.Issuance.verifyAndParseCredential(
        issuerConf,
        credential,
        credentialId,
        { credentialCryptoContext },
        "MIIDATCCAqigAwIBAgIUDuo86rLhWqvlAVBv123mPwpakRkwCgYIKoZIzj0EAwIwezELMAkGA1UEBhMCSVQxDjAMBgNVBAgMBUl0YWx5MQ0wCwYDVQQHDARSb21lMRMwEQYDVQQKDApQYWdvUEEgc3BhMRYwFAYDVQQLDA1JTyBXYWxsZXQgTGFiMSAwHgYDVQQDDBdpby53YWxsZXQubGFiLnBhZ29wYS5pdDAeFw0yNTA3MTUxMzE0MjVaFw0zNTA3MTMxMzE0MjVaMHsxCzAJBgNVBAYTAklUMQ4wDAYDVQQIDAVJdGFseTENMAsGA1UEBwwEUm9tZTETMBEGA1UECgwKUGFnb1BBIHNwYTEWMBQGA1UECwwNSU8gV2FsbGV0IExhYjEgMB4GA1UEAwwXaW8ud2FsbGV0LmxhYi5wYWdvcGEuaXQwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAS85HVFoPPPtWY+KKQAUlhPrEf1/3KfmpWCm1NNRzyIwVtTCansEMQ5rIdevaY2IWtDmjKHAVS2WxsaqbcvzGfpo4IBCDCCAQQwHQYDVR0OBBYEFBVRh4zCLNbcJXwGOAkEKk0my6kLMB8GA1UdIwQYMBaAFBVRh4zCLNbcJXwGOAkEKk0my6kLMA4GA1UdDwEB/wQEAwIHgDASBgNVHSUECzAJBgcrgYxdBQECMEsGA1UdEgREMEKGQGh0dHBzOi8vaW8tZC1pdG4td2FsbGV0LWlzc3Vlci1mdW5jLTAxLmF6dXJld2Vic2l0ZXMubmV0L2NybC5wZW0wUQYDVR0fBEowSDBGoESgQoZAaHR0cHM6Ly9pby1kLWl0bi13YWxsZXQtaXNzdWVyLWZ1bmMtMDEuYXp1cmV3ZWJzaXRlcy5uZXQvY3JsLnBlbTAKBggqhkjOPQQDAgNHADBEAiA89LSmT0widlVSM/oXSeQnGNDo6Bt9rp5GEGUXa4dtCQIgHSrvjvfDofWQTDXNH6vpt/MDP7Inl4mahYcsYqF0ZmM=",
        {
          connectTimeout: 10000,
          readTimeout: 10000,
          requireCrl: false,
        }
      );

    return {
      parsedCredential,
      credential,
      keyTag: credentialKeyTag,
      credentialType,
      credentialConfigurationId: credentialId,
      format,
    };
  }
);
