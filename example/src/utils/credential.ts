import {
  createCryptoContextFor,
  Credential,
  IoWallet,
  Trust,
  type ItwVersion,
  CredentialIssuance,
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

/**
 * Implements a flow to obtain a generic credential.
 * @param itwVersion IT-Wallet specifications version
 * @param credentialIssuerUrl - The credential issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialId - The id of the credential to obtain
 * @param pid - The PID credential
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @returns The obtained credential result
 */
export const getCredential = async ({
  itwVersion,
  credentialIssuerUrl,
  trustAnchorUrl,
  redirectUri,
  credentialId,
  pid,
  walletInstanceAttestation,
  wiaCryptoContext,
}: {
  itwVersion: ItwVersion;
  credentialIssuerUrl: string;
  trustAnchorUrl: string;
  redirectUri: string;
  credentialId: SupportedCredentialsWithoutPid;
  pid: PidResult;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
}): Promise<CredentialResult> => {
  const wallet = new IoWallet({ version: itwVersion });
  // Create credential crypto context
  const credentialKeyTag = uuidv4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Evaluate issuer trust
  const { issuerConf } =
    await wallet.CredentialIssuance.evaluateIssuerTrust(credentialIssuerUrl);

  // Start user authorization
  const { issuerRequestUri, clientId, codeVerifier } =
    await wallet.CredentialIssuance.startUserAuthorization(
      issuerConf,
      [credentialId],
      { proofType: "none" },
      {
        walletInstanceAttestation,
        redirectUri,
        wiaCryptoContext,
        appFetch,
      }
    );

  const requestObject =
    await wallet.CredentialIssuance.getRequestedCredentialToBePresented(
      issuerRequestUri,
      clientId,
      issuerConf,
      appFetch
    );

  // Complete the user authorization via form_post.jwt mode
  const { code } =
    await wallet.CredentialIssuance.completeUserAuthorizationWithFormPostJwtMode(
      requestObject,
      pid.credential,
      { wiaCryptoContext, pidCryptoContext: createCryptoContextFor(pid.keyTag) }
    );

  // Generate the DPoP context which will be used for the whole issuance flow
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

  // For simplicity, in this example flow we work on a single credential.
  const { credential_configuration_id, credential_identifiers } =
    accessToken.authorization_details[0]!;

  // Obtain the credential
  const { credential, format } =
    await wallet.CredentialIssuance.obtainCredential(
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
      ? await getTrustAnchorX509Certificate(itwVersion, trustAnchorUrl)
      : undefined;

  // Parse and verify the credential. The ignoreMissingAttributes flag must be set to false or omitted in production.
  const { parsedCredential } =
    await wallet.CredentialIssuance.verifyAndParseCredential(
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
 * @param itwVersion IT-Wallet specifictions version
 * @param trustAnchorUrl The TA url
 * @returns The base64 encoded Trust Anchor's CA
 */
export const getTrustAnchorX509Certificate = async (
  itwVersion: ItwVersion,
  trustAnchorUrl: string
) => {
  const wallet = new IoWallet({ version: itwVersion });
  const trustAnchorEntityConfig =
    await wallet.Trust.getTrustAnchorEntityConfiguration(trustAnchorUrl, {
      appFetch,
    });
  const taHeaderKid = trustAnchorEntityConfig.header.kid;
  const taSigningJwk = trustAnchorEntityConfig.payload.keys.find(
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
  credential: string,
  format: CredentialIssuance.CredentialFormat,
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
  const { issuerConf } =
    await CredentialIssuance.V1_0_0.evaluateIssuerTrust(issuerUrl); // TODO: [SIW-3743] refactor status

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
