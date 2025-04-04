import {
  Credential,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import appFetch from "../utils/fetch";
import { DPOP_KEYTAG, regenerateCryptoKey, WIA_KEYTAG } from "../utils/crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  CredentialResult,
  PidResult,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import { openUrlAndListenForAuthRedirect } from "./openUrlAndListenForRedirect";
import { DcqlQuery } from "dcql";

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
  credentialType,
  wiaCryptoContext,
}: {
  pidIssuerUrl: string;
  redirectUri: string;
  idpHint: string;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
  credentialType: "PersonIdentificationData";
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
 * @param credentialIssuerUrl - The credential issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialType - The type of the credential to obtain, which must be `PersonIdentificationData`
 * @param pid - The PID credential
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @returns The obtained credential result
 */
export const getCredential = async ({
  credentialIssuerUrl,
  redirectUri,
  credentialType,
  pid,
  walletInstanceAttestation,
  wiaCryptoContext,
}: {
  credentialIssuerUrl: string;
  redirectUri: string;
  credentialType: SupportedCredentialsWithoutPid;
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
    credentialType,
  });

  const { issuerUrl } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } =
    await Credential.Issuance.evaluateIssuerTrust(issuerUrl);

  // Start user authorization
  const { issuerRequestUri, clientId, codeVerifier, credentialDefinition } =
    await Credential.Issuance.startUserAuthorization(
      issuerConf,
      credentialType,
      {
        walletInstanceAttestation,
        redirectUri,
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

  // The credentials to be presented will always include the PID and WIA
  // in a credential issuance flow
  const credentialsSdJwt = [
    [pid.keyTag, pid.credential],
    [WIA_KEYTAG, walletInstanceAttestation],
  ] as [string, string][];

  if (!requestObject.dcql_query) {
    throw new Error("Invalid request object");
  }

  // Assuming that WIA is a SD-JWT
  const dcqlQueryResult = Credential.Presentation.evaluateDcqlQuery(
    credentialsSdJwt,
    requestObject.dcql_query as DcqlQuery
  );

  const credentialsToPresent = dcqlQueryResult.map(
    ({ requiredDisclosures, ...rest }) => ({
      ...rest,
      requestedClaims: requiredDisclosures.map(([, claimName]) => claimName),
    })
  );

  // The app here should ask the user to confirm the required data contained in the requestObject

  // Complete the user authorization via form_post.jwt mode
  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithFormPostJwtMode(
      requestObject,
      credentialsToPresent
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
  credentialType: SupportedCredentialsWithoutPid
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
    credentialCryptoContext
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
