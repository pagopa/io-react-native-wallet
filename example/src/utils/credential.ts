import type { CryptoContext } from "@pagopa/io-react-native-jwt";

import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { getRedirects } from "@pagopa/io-react-native-login-utils";
import {
  createCryptoContextFor,
  type CredentialIssuance,
  IoWallet,
  type ItwVersion,
  type RemotePresentation,
  Trust,
} from "@pagopa/io-react-native-wallet";
import last from "lodash/last";
import { v4 as uuidv4 } from "uuid";

import type {
  CredentialResult,
  PidResult,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import type { Env } from "./environment";

import appFetch from "../utils/fetch";
import { DPOP_KEYTAG, regenerateCryptoKey } from "./crypto";

/**
 * Implements a flow to obtain a generic credential.
 * @param itwVersion IT-Wallet specifications version
 * @param issuerConf - The resolved Issuer configuration (issuer trust already evaluated)
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialId - The id of the credential to obtain
 * @param credentialKeyTag - The key tag of the crypto key to bind to the credential
 * @param pid - The PID credential
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @param scope - (optional) OAuth 2.0 scope forwarded to the PAR, from a credential offer
 * @param issuerState - (optional) issuer state forwarded to the PAR, from a credential offer
 * @returns The obtained credential result
 */
export const getCredential = async ({
  batchSize = 1,
  credentialId,
  generateKeysWithAttestation,
  issuerConf,
  issuerState,
  itwVersion,
  pid,
  redirectUri,
  scope,
  trustAnchorUrl,
  walletInstanceAttestation,
  wiaCryptoContext,
}: {
  batchSize?: number;
  credentialId: SupportedCredentialsWithoutPid;
  generateKeysWithAttestation: (
    keyTags: string[],
  ) => Promise<string | undefined>;
  issuerConf: CredentialIssuance.IssuerConfig;
  issuerState?: string;
  itwVersion: ItwVersion;
  pid: PidResult;
  redirectUri: string;
  scope?: string;
  trustAnchorUrl: string;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
}): Promise<CredentialResult> => {
  const wallet = new IoWallet({ version: itwVersion });

  // Start user authorization
  const { clientId, codeVerifier, issuerRequestUri, responseMode } =
    await wallet.CredentialIssuance.startUserAuthorization(
      issuerConf,
      [credentialId],
      { proofType: "none" },
      {
        appFetch,
        issuerState,
        redirectUri,
        scope,
        walletInstanceAttestation,
        wiaCryptoContext,
      },
    );

  const requestObject =
    await wallet.CredentialIssuance.getRequestedCredentialToBePresented(
      issuerRequestUri,
      clientId,
      issuerConf,
      appFetch,
    );

  const evaluatedDcqlQuery = await wallet.RemotePresentation.evaluateDcqlQuery(
    requestObject.dcql_query as RemotePresentation.DcqlQuery,
    [[pid.keyTag, pid.credential]],
  );

  let code: string;
  if (responseMode === "form_post.jwt") {
    // Complete the user authorization via form_post.jwt mode
    ({ code } =
      await wallet.CredentialIssuance.completeUserAuthorizationWithFormPostJwtMode(
        requestObject,
        issuerConf,
        evaluatedDcqlQuery,
        { appFetch, wiaCryptoContext },
      ));
  } else {
    // Complete the user authorization via query mode
    ({ code } =
      await wallet.CredentialIssuance.completeEaaUserAuthorizationWithQueryMode(
        requestObject,
        issuerConf,
        evaluatedDcqlQuery,
        redirectUri,
        {
          appFetch,
          // Temporary workaround for a known bug affecting React Native 0.82-0.83. See https://github.com/facebook/react-native/issues/55248
          fetchFinalRedirectUri: (url) =>
            getRedirects(url, {}, "code").then(last),
        },
      ));
  }

  // Generate the DPoP context which will be used for the whole issuance flow
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

  // For simplicity, in this example flow we work on a single credential.
  const { credential_configuration_id, credential_identifiers } =
    accessToken.authorization_details[0]!;

  // Create as many key tags as the batch size
  const keyTags = Array.from({ length: batchSize }, () => uuidv4().toString());
  const walletUnitAttestation = await generateKeysWithAttestation(keyTags);
  const credentialCryptoContexts = keyTags.map(createCryptoContextFor);

  const credentialDefinition = {
    credential_configuration_id,
    credential_identifier: credential_identifiers[0]!,
  };

  const credentialResult =
    batchSize > 1
      ? await wallet.CredentialIssuance.obtainCredentialsBatch(
          issuerConf,
          accessToken,
          clientId,
          credentialDefinition,
          {
            appFetch,
            credentialCryptoContexts,
            dPopCryptoContext,
            walletUnitAttestation,
          },
        )
      : await wallet.CredentialIssuance.obtainCredential(
          issuerConf,
          accessToken,
          clientId,
          credentialDefinition,
          {
            appFetch,
            credentialCryptoContext: credentialCryptoContexts[0]!,
            dPopCryptoContext,
            walletUnitAttestation,
          },
        );

  // In the example app we are not interested in storing the entire batch: it is sufficient
  // that the batch size is respected, so we return only the first credential for simplicity.
  // For production use cases, you should properly handle the entire batch.
  const { credential, format } = Array.isArray(credentialResult)
    ? credentialResult[0]!
    : credentialResult;

  const x509CertRoot =
    format === "mso_mdoc" || itwVersion !== "1.0.0"
      ? await getTrustAnchorX509Certificate(itwVersion, trustAnchorUrl)
      : undefined;

  const credentialKeyTag = keyTags[0]!;
  const credentialCryptoContext = credentialCryptoContexts[0]!;

  // Parse and verify the credential. The ignoreMissingAttributes flag must be set to false or omitted in production.
  const { parsedCredential } =
    await wallet.CredentialIssuance.verifyAndParseCredential(
      issuerConf,
      credential,
      credential_configuration_id,
      { credentialCryptoContext, ignoreMissingAttributes: true },
      x509CertRoot,
    );

  return {
    credential,
    credentialConfigurationId: credential_configuration_id,
    credentialType:
      credential_configuration_id as SupportedCredentialsWithoutPid,
    format,
    keyTag: credentialKeyTag,
    parsedCredential,
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
  trustAnchorUrl: string,
) => {
  const wallet = new IoWallet({ version: itwVersion });
  const trustAnchorEntityConfig =
    await wallet.Trust.getTrustAnchorEntityConfiguration(trustAnchorUrl, {
      appFetch,
    });
  const taHeaderKid = trustAnchorEntityConfig.jwt.header.kid;
  const taSigningJwk = trustAnchorEntityConfig.keys.find(
    (key) => key.kid === taHeaderKid,
  );

  if (!taSigningJwk) {
    throw new Trust.Errors.FederationError(
      `Cannot derive X.509 Trust Anchor certificate: JWK with kid '${taHeaderKid}' not found in Trust Anchor's JWKS.`,
      { reason: "JWK not found for header kid", trustAnchorKid: taHeaderKid },
    );
  }

  if (taSigningJwk.x5c && taSigningJwk.x5c.length > 0 && taSigningJwk.x5c[0]) {
    return taSigningJwk.x5c[0];
  }

  throw new Trust.Errors.FederationError(
    `Cannot derive X.509 Trust Anchor certificate: JWK with kid '${taHeaderKid}' does not contain a valid 'x5c' certificate array.`,
    { reason: "Missing or empty x5c in JWK", trustAnchorKid: taHeaderKid },
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
  credentialType: SupportedCredentials,
) => {
  const wallet = new IoWallet({ version: itwVersion });

  if (!wallet.CredentialStatus.statusAssertion.isSupported) {
    throw new Error(
      `Status assertion is not supported in version ${itwVersion}`,
    );
  }

  // Evaluate issuer trust
  const { issuerConf } =
    await wallet.CredentialIssuance.evaluateIssuerTrust(credentialIssuerUrl);

  const statusAssertion = await wallet.CredentialStatus.statusAssertion.get(
    issuerConf,
    credential,
    format,
    { credentialCryptoContext, wiaCryptoContext },
  );

  const parsedStatusAssertion =
    await wallet.CredentialStatus.statusAssertion.verifyAndParse(
      issuerConf,
      statusAssertion,
      credential,
      format,
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
  format: CredentialIssuance.CredentialFormat,
) => {
  const wallet = new IoWallet({ version: itwVersion });

  if (!wallet.CredentialStatus.statusList.isSupported) {
    throw new Error(`Status list is not supported in version ${itwVersion}`);
  }

  const keys = await getKeysForStatusListVerification(
    itwVersion,
    env,
    credential,
    credentialType,
  );

  const { idx, statusList: statusListJwt } =
    await wallet.CredentialStatus.statusList.get(credential, format, {
      appFetch,
    });
  const statusList = await wallet.CredentialStatus.statusList.verifyAndParse(
    keys,
    statusListJwt,
  );

  const result = wallet.CredentialStatus.statusList.getStatus(
    statusList.status_list,
    idx,
  );

  return {
    statusList,
    ...result,
  };
};

const getKeysForStatusListVerification = async (
  itwVersion: ItwVersion,
  env: Env,
  credential: string,
  credentialType: string,
) => {
  if (credentialType === "walletUnitAttestation") {
    const decodedWua = decodeJwt(credential);

    const { payload } = await fetch(
      `${decodedWua.payload.iss}/.well-known/openid-federation`,
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
    issuerUrl.value(itwVersion),
  );
  return issuerConf.keys;
};
