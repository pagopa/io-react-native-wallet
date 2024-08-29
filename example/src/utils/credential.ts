import {
  Credential,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { openAuthenticationSession } from "@pagopa/io-react-native-login-utils";

import {
  REDIRECT_URI,
  WALLET_EAA_PROVIDER_BASE_URL,
  WALLET_PID_PROVIDER_BASE_URL,
} from "@env";
import uuid from "react-native-uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import appFetch from "../utils/fetch";
import { DPOP_KEYTAG, regenerateCryptoKey } from "../utils/crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { CredentialResult, SupportedCredentials } from "../store/types";

/**
 * Implements a flow to obtain a PID credential.
 * @param idpHint - The hint for the Identity Provider to use
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @param credentialType - The type of the credential to obtain, which must be `PersonIdentificationData`
 * @returns The obtained credential result
 */
export const getPid = async (
  idpHint: string,
  walletInstanceAttestation: string,
  wiaCryptoContext: CryptoContext,
  credentialType: "PersonIdentificationData"
): Promise<CredentialResult> => {
  // Create identification context only for SPID
  const authorizationContext = idpHint.includes("servizicie")
    ? undefined
    : {
        authorize: openAuthenticationSession,
      };
  /*
   * Create credential crypto context for the PID
   * WARNING: The eID keytag must be persisted and later used when requesting a credential which requires a eID presentation
   */
  const credentialKeyTag = uuid.v4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Start the issuance flow
  const startFlow: Credential.Issuance.StartFlow = () => ({
    issuerUrl: WALLET_PID_PROVIDER_BASE_URL,
    credentialType: "PersonIdentificationData",
    appFetch,
  });

  const { issuerUrl } = startFlow();

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
        redirectUri: `${REDIRECT_URI}`,
        wiaCryptoContext,
        appFetch,
      }
    );

  // Complete the authroization process with query mode with the authorizationContext which opens the browser
  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithQueryMode(
      issuerRequestUri,
      clientId,
      issuerConf,
      idpHint,
      REDIRECT_URI,
      authorizationContext
    );

  // Create DPoP context which will be used for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await Credential.Issuance.authorizeAccess(
    issuerConf,
    code,
    clientId,
    REDIRECT_URI,
    codeVerifier,
    {
      walletInstanceAttestation,
      wiaCryptoContext,
      dPopCryptoContext,
      appFetch,
    }
  );

  // Obtain che eID credential
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

  // Parse and verify the eID credential
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
    credentialType,
  };
};

/**
 * Implements a flow to obtain a generic credential.
 * @param credentialType - The type of the credential to obtain, which must be `PersonIdentificationData`
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @param pid - The PID credential
 * @param pidCryptoContext - The PID credential crypto context
 * @returns The obtained credential result
 */
export const getCredential = async (
  credentialType: SupportedCredentials,
  walletInstanceAttestation: string,
  wiaCryptoContext: CryptoContext,
  pid: string,
  pidCryptoContext: CryptoContext
): Promise<CredentialResult> => {
  // Create credential crypto context
  const credentialKeyTag = uuid.v4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Start the issuance flow
  const startFlow: Credential.Issuance.StartFlow = () => ({
    issuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
    credentialType,
  });

  const { issuerUrl } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
    issuerUrl
  );

  // Start user authorization
  const { issuerRequestUri, clientId, codeVerifier, credentialDefinition } =
    await Credential.Issuance.startUserAuthorization(
      issuerConf,
      credentialType,
      {
        walletInstanceAttestation,
        redirectUri: `${REDIRECT_URI}`,
        wiaCryptoContext,
        appFetch,
      }
    );

  const requestObject =
    await Credential.Issuance.getRequestedCredentialToBePresented(
      issuerRequestUri,
      clientId,
      issuerConf,
      appFetch
    );

  // The app here should ask the user to confirm the required data contained in the requestObject

  // Complete the user authorization via form_post.jwt mode
  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithFormPostJwtMode(
      requestObject,
      { wiaCryptoContext, pidCryptoContext, pid, walletInstanceAttestation }
    );

  // Generate the DPoP context which will be used for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await Credential.Issuance.authorizeAccess(
    issuerConf,
    code,
    clientId,
    REDIRECT_URI,
    codeVerifier,
    {
      walletInstanceAttestation,
      wiaCryptoContext,
      dPopCryptoContext,
      appFetch,
    }
  );

  // Obtain the credential
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

  // Parse and verify the credential. The ignoreMissingAttributes flag must be set to false or omitted in production.
  const { parsedCredential } =
    await Credential.Issuance.verifyAndParseCredential(
      issuerConf,
      credential,
      format,
      { credentialCryptoContext, ignoreMissingAttributes: true }
    );

  return {
    parsedCredential,
    credential,
    keyTag: credentialKeyTag,
    credentialType,
  };
};

/**
 * Implements a flow to obtain a credential status attestation.
 * @param credential - The credential to obtain the status attestation for
 * @param credentialCryptoContext - The credential crypto context associated with the credential
 * @param credentialType - The type of the credential
 * @returns The credential status attestation
 */
export const getCredentialStatusAttestation = async (
  credential: string,
  credentialCryptoContext: CryptoContext,
  credentialType: SupportedCredentials
) => {
  // Start the issuance flow
  const startFlow: Credential.Status.StartFlow = () => ({
    issuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
  });

  const { issuerUrl } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } = await Credential.Status.evaluateIssuerTrust(issuerUrl);

  const res = await Credential.Status.statusAttestation(
    issuerConf,
    credential,
    credentialCryptoContext
  );
  return {
    statusAttestation: res.statusAttestation,
    credentialType,
  };
};
