import {
  createCryptoContextFor,
  Credential,
  Trust,
} from "@pagopa/io-react-native-wallet";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import appFetch from "../utils/fetch";
import { DPOP_KEYTAG, regenerateCryptoKey } from "./crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  CredentialResult,
  PidResult,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import { openUrlAndListenForAuthRedirect } from "./openUrlAndListenForRedirect";
import type { Out } from "../../../src/utils/misc";
import type { ObtainCredential } from "../../../src/credential/issuance";

/**
 * Implements a flow to obtain a PID credential.
 * @param pidIssuerUrl - The PID issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param idpHint - The hint for the Identity Provider to use
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @param withMRTDPoP - Whether proof of MRTD ownership is required
 * @returns The obtained credential result
 */
export const getPidCieID = async ({
  pidIssuerUrl,
  redirectUri,
  idpHint,
  walletInstanceAttestation,
  wiaCryptoContext,
  withMRTDPoP,
}: {
  pidIssuerUrl: string;
  redirectUri: string;
  idpHint: string;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
  withMRTDPoP?: boolean;
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
      withMRTDPoP
        ? { proofType: "document", idpHinting: idpHint }
        : { proofType: "none" },
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
        (pidCredentialDefinition?.type === "openid_credential"
          ? pidCredentialDefinition.credential_configuration_id
          : undefined)
    ) ?? {};

  // Get the first credential_identifier from the access token's authorization details
  const [credential_identifier] = credential_identifiers ?? [];

  if (!credential_configuration_id) {
    throw new Error("No credential configuration ID found for PID");
  }

  // Obtain che eID credential
  const { credential, format } = await Credential.Issuance.obtainCredential(
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
    format,
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
  trustAnchorUrl,
  redirectUri,
  credentialId,
  pid,
  walletInstanceAttestation,
  wiaCryptoContext,
}: {
  credentialIssuerUrl: string;
  trustAnchorUrl: string;
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
  const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
    issuerUrl
  );

  // Start user authorization
  const { issuerRequestUri, clientId, codeVerifier } =
    await Credential.Issuance.startUserAuthorization(
      issuerConf,
      [credId],
      { proofType: "none" },
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
  const { credential, format } = await Credential.Issuance.obtainCredential(
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

  const x509CertRoot =
    format === "mso_mdoc"
      ? await getTrustAnchorX509Certificate(trustAnchorUrl)
      : undefined;

  // Parse and verify the credential. The ignoreMissingAttributes flag must be set to false or omitted in production.
  const { parsedCredential } =
    await Credential.Issuance.verifyAndParseCredential(
      issuerConf,
      credential,
      credential_configuration_id,
      { credentialCryptoContext, ignoreMissingAttributes: true },
      x509CertRoot
    );

  return {
    parsedCredential,
    credential,
    keyTag: credentialKeyTag,
    credentialType:
      credential_configuration_id as SupportedCredentialsWithoutPid,
    credentialConfigurationId: credential_configuration_id,
    format,
  };
};

/**
 * This function is for development use only and should not be used in production
 *
 * @param trustAnchorUrl The TA url
 * @returns The base64 encoded Trust Anchor's CA
 */
export const getTrustAnchorX509Certificate = async (trustAnchorUrl: string) => {
  const trustAnchorEntityConfig =
    await Trust.Build.getTrustAnchorEntityConfiguration(trustAnchorUrl, {
      appFetch,
    });
  const taHeaderKid = trustAnchorEntityConfig.header.kid;
  const taSigningJwk = trustAnchorEntityConfig.payload.jwks.keys.find(
    (key) => key.kid === taHeaderKid
  );

  if (!taSigningJwk) {
    throw new Trust.Errors.FederationError(
      `Cannot derive X.509 Trust Anchor certificate: JWK with kid '${taHeaderKid}' not found in Trust Anchor's JWKS.`,
      { trustAnchorKid: taHeaderKid, reason: "JWK not found for header kid" }
    );
  }

  if (taSigningJwk.x5c && taSigningJwk.x5c.length > 0 && taSigningJwk.x5c[0]) {
    return taSigningJwk.x5c[0];
  }

  throw new Trust.Errors.FederationError(
    `Cannot derive X.509 Trust Anchor certificate: JWK with kid '${taHeaderKid}' does not contain a valid 'x5c' certificate array.`,
    { trustAnchorKid: taHeaderKid, reason: "Missing or empty x5c in JWK" }
  );
};

/**
 * Implements a flow to obtain a credential status assertion.
 * @param credentialIssuerUrl - The credential issuer URL
 * @param credential - The credential to obtain the status assertion for
 * @param format - The format of the credential, e.g. "sd-jwt"
 * @param credentialCryptoContext - The credential crypto context associated with the credential
 * @param credentialType - The type of the credential
 * @returns The credential status assertion
 */
export const getCredentialStatusAssertion = async (
  credentialIssuerUrl: string,
  credential: Out<ObtainCredential>["credential"],
  format: Out<ObtainCredential>["format"],
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

  const statusAssertion = await Credential.Status.statusAssertion(
    issuerConf,
    credential,
    format,
    { credentialCryptoContext, wiaCryptoContext }
  );

  const parsedStatusAssertion =
    await Credential.Status.verifyAndParseStatusAssertion(
      issuerConf,
      statusAssertion,
      credential,
      format
    );

  return {
    ...statusAssertion,
    ...parsedStatusAssertion,
    credentialType,
  };
};
