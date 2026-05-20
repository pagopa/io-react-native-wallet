import {
  createCryptoContextFor,
  IoWallet,
  Trust,
  type ItwVersion,
  type CredentialIssuance,
} from "@pagopa/io-react-native-wallet";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import appFetch from "../utils/fetch";
import { DPOP_KEYTAG, regenerateCryptoKey } from "./crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type {
  CredentialResult,
  PidResult,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import type { Env } from "./environment";

/**
 * Implements a flow to obtain a generic credential.
 * @param itwVersion IT-Wallet specifications version
 * @param credentialIssuerUrl - The credential issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialId - The id of the credential to obtain
 * @param credentialKeyTag - The key tag of the crypto key to bind to the credential
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
  credentialKeyTag,
  pid,
  walletInstanceAttestation,
  generateKeyWithAttestation,
  wiaCryptoContext,
}: {
  itwVersion: ItwVersion;
  credentialIssuerUrl: string;
  trustAnchorUrl: string;
  redirectUri: string;
  credentialId: SupportedCredentialsWithoutPid;
  credentialKeyTag: string;
  pid: PidResult;
  walletInstanceAttestation: string;
  generateKeyWithAttestation: () => Promise<string | undefined>;
  wiaCryptoContext: CryptoContext;
}): Promise<CredentialResult> => {
  const wallet = new IoWallet({ version: itwVersion });
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
      issuerConf,
      pid.credential,
      { wiaCryptoContext, pidKeyTag: pid.keyTag }
    );

  // Generate the DPoP context which will be used for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const { accessToken } = await wallet.CredentialIssuance.authorizeAccess(
    issuerConf,
    code,
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

  const walletUnitAttestation = await generateKeyWithAttestation();

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
        walletUnitAttestation,
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
  const taHeaderKid = trustAnchorEntityConfig.jwt.header.kid;
  const taSigningJwk = trustAnchorEntityConfig.keys.find(
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
  itwVersion: ItwVersion,
  credentialIssuerUrl: string,
  credential: string,
  format: CredentialIssuance.CredentialFormat,
  credentialCryptoContext: CryptoContext,
  wiaCryptoContext: CryptoContext,
  credentialType: SupportedCredentials
) => {
  const wallet = new IoWallet({ version: itwVersion });

  if (!wallet.CredentialStatus.statusAssertion.isSupported) {
    throw new Error(
      `Status assertion is not supported in version ${itwVersion}`
    );
  }

  // Evaluate issuer trust
  const { issuerConf } =
    await wallet.CredentialIssuance.evaluateIssuerTrust(credentialIssuerUrl);

  const statusAssertion = await wallet.CredentialStatus.statusAssertion.get(
    issuerConf,
    credential,
    format,
    { credentialCryptoContext, wiaCryptoContext }
  );

  const parsedStatusAssertion =
    await wallet.CredentialStatus.statusAssertion.verifyAndParse(
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

/**
 * Get the status of a credential via the Token Status List.
 * @param itwVersion IT-Wallet specifications version
 * @param env The environment variables
 * @param credentialType The type of the credential
 * @param credential The raw credential to obtain the status for
 * @param format The format of the credential
 * @returns The credential status
 */
export const getCredentialStatusFromStatusList = async (
  itwVersion: ItwVersion,
  env: Env,
  credential: string,
  credentialType: string,
  format: CredentialIssuance.CredentialFormat
) => {
  const wallet = new IoWallet({ version: itwVersion });

  if (!wallet.CredentialStatus.statusList.isSupported) {
    throw new Error(`Status list is not supported in version ${itwVersion}`);
  }

  const keys = await getKeysForStatusListVerification(
    itwVersion,
    env,
    credential,
    credentialType
  );

  const statusListParams = await wallet.CredentialStatus.statusList.get(
    credential,
    format,
    { appFetch }
  );

  const result = await wallet.CredentialStatus.statusList.verifyAndParse(
    keys,
    statusListParams
  );

  return {
    statusList: statusListParams.statusList,
    ...result,
  };
};

const getKeysForStatusListVerification = async (
  itwVersion: ItwVersion,
  env: Env,
  credential: string,
  credentialType: string
) => {
  if (credentialType === "walletUnitAttestation") {
    const decodedWua = decodeJwt(credential);

    const { payload } = await fetch(
      `${decodedWua.payload.iss}/.well-known/openid-federation`
    )
      .then((res) => res.text())
      .then(decodeJwt);

    // This type should be parsed and validated more robustly (or even moved to the library),
    // but for simplicity it is casted to the expected shape as this is just an example.
    const walletProviderJwt = payload as {
      metadata: {
        wallet_solution: {
          jwks: { keys: CredentialIssuance.IssuerConfig["keys"] };
        };
      };
    };

    return walletProviderJwt.metadata.wallet_solution.jwks.keys;
  }

  const wallet = new IoWallet({ version: itwVersion });
  const issuerUrl =
    credentialType === "PersonIdentificationData"
      ? env.WALLET_PID_PROVIDER_BASE_URL
      : env.WALLET_EAA_PROVIDER_BASE_URL;

  const { issuerConf } = await wallet.CredentialIssuance.evaluateIssuerTrust(
    issuerUrl.value(itwVersion)
  );
  return issuerConf.keys;
};
