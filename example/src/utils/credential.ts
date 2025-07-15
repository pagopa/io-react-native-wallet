import {
  Credential,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import appFetch from "../utils/fetch";
import { DPOP_KEYTAG, regenerateCryptoKey } from "../utils/crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  CredentialResult,
  PidResult,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import { openUrlAndListenForAuthRedirect } from "./openUrlAndListenForRedirect";

/**
 * Implements a flow to obtain a PID credential.
 * @param pidIssuerUrl - The PID issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param idpHint - The hint for the Identity Provider to use
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @param credentialType - The type of the credential to obtain, which must be `PersonIdentificationData`
 * @returns The obtained credential result
 */
export const getPidCieID = async ({
  pidIssuerUrl,
  redirectUri,
  idpHint,
  walletInstanceAttestation,
  wiaCryptoContext,
}: {
  pidIssuerUrl: string;
  redirectUri: string;
  idpHint: string;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
}): Promise<PidResult> => {
  /*
   * Create credential crypto context for the PID
   * WARNING: The eID keytag must be persisted and later used when requesting a credential which requires a eID presentation
   */
  const credentialKeyTag = uuidv4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Start the issuance flow
  const startFlow: Credential.Issuance.StartFlow = () => ({
    issuerUrl: pidIssuerUrl,
    credentialId: "dc_sd_jwt_PersonIdentificationData",
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
        redirectUri,
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

  // Open the authorization URL and listen for the redirect
  const { authRedirectUrl } = await openUrlAndListenForAuthRedirect(
    redirectUri,
    authUrl
  );

  // Complete the authroization process with query mode
  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithQueryMode(
      authRedirectUrl
    );

  // Create DPoP context which will be used for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await Credential.Issuance.authorizeAccess(
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

  // Obtain che eID credential
  const { credential } = await Credential.Issuance.obtainCredential(
    issuerConf,
    accessToken,
    clientId,
    { credential_configuration_id, credential_identifier },
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
      credential_configuration_id,
      { credentialCryptoContext }
    );

  return {
    parsedCredential,
    credential,
    keyTag: credentialKeyTag,
    credentialType: "PersonIdentificationData",
    credentialConfigurationId: credential_configuration_id,
  };
};

/**
 * Implements a flow to obtain a generic credential.
 * @param credentialIssuerUrl - The credential issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialId - The id of the credential to obtain
 * @param pid - The PID credential
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @returns The obtained credential result
 */
export const getCredential = async ({
  credentialIssuerUrl,
  redirectUri,
  credentialId,
  pid,
  walletInstanceAttestation,
  wiaCryptoContext,
}: {
  credentialIssuerUrl: string;
  redirectUri: string;
  credentialId: SupportedCredentialsWithoutPid;
  pid: PidResult;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
}): Promise<CredentialResult> => {
  // Create credential crypto context
  const credentialKeyTag = uuidv4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Start the issuance flow
  const startFlow: Credential.Issuance.StartFlow = () => ({
    issuerUrl: credentialIssuerUrl,
    credentialId,
  });

  const { issuerUrl, credentialId: credId } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } =
    await Credential.Issuance.evaluateIssuerTrust(issuerUrl);

  // Start user authorization
  const { issuerRequestUri, clientId, codeVerifier } =
    await Credential.Issuance.startUserAuthorization(issuerConf, [credId], {
      walletInstanceAttestation,
      redirectUri,
      wiaCryptoContext,
      appFetch,
    });

  const requestObject =
    await Credential.Issuance.getRequestedCredentialToBePresented(
      issuerRequestUri,
      clientId,
      issuerConf,
      appFetch
    );

  // Complete the user authorization via form_post.jwt mode
  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithFormPostJwtMode(
      requestObject,
      pid.credential,
      { wiaCryptoContext, pidCryptoContext: createCryptoContextFor(pid.keyTag) }
    );

  // Generate the DPoP context which will be used for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await Credential.Issuance.authorizeAccess(
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

  // For simplicity, in this example flow we work on a single credential.
  const { credential_configuration_id, credential_identifiers } =
    accessToken.authorization_details[0]!;

  // Obtain the credential
  const { credential } = await Credential.Issuance.obtainCredential(
    issuerConf,
    accessToken,
    clientId,
    {
      credential_configuration_id,
      credential_identifier: credential_identifiers[0],
    },
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
      credential_configuration_id,
      { credentialCryptoContext, ignoreMissingAttributes: true }
    );

  return {
    parsedCredential,
    credential,
    keyTag: credentialKeyTag,
    credentialType:
      credential_configuration_id as SupportedCredentialsWithoutPid,
    credentialConfigurationId: credential_configuration_id,
  };
};

/**
 * Implements a flow to obtain a credential status attestation.
 * @param credentialIssuerUrl - The credential issuer URL
 * @param credential - The credential to obtain the status attestation for
 * @param credentialCryptoContext - The credential crypto context associated with the credential
 * @param credentialType - The type of the credential
 * @returns The credential status attestation
 */
export const getCredentialStatusAttestation = async (
  credentialIssuerUrl: string,
  credential: string,
  credentialCryptoContext: CryptoContext,
  wiaCryptoContext: CryptoContext,
  credentialType: SupportedCredentials
) => {
  // Start the issuance flow
  const startFlow: Credential.Status.StartFlow = () => ({
    issuerUrl: credentialIssuerUrl,
  });

  const { issuerUrl } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } = await Credential.Status.evaluateIssuerTrust(issuerUrl);

  const statusAttestation = await Credential.Status.statusAttestation(
    issuerConf,
    credential,
    { credentialCryptoContext, wiaCryptoContext }
  );

  const parsedStatusAttestation =
    await Credential.Status.verifyAndParseStatusAttestation(
      issuerConf,
      statusAttestation,
      {
        credentialCryptoContext,
      }
    );

  return {
    ...statusAttestation,
    ...parsedStatusAttestation,
    credentialType,
  };
};
