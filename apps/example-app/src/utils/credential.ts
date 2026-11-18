import {
  type CredentialIssuance,
  IoWallet,
  type RemotePresentation,
  type Signer,
} from "@io-app-it-wallet/io-react-native-wallet";
import { decode as decodeJwt } from "@pagopa/io-react-native-jwt";
import { v4 as uuidv4 } from "uuid";

import type {
  CredentialResult,
  PidResult,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import type { Env } from "./environment";

import appFetch from "../utils/fetch";
import {
  createLocalSignerFor,
  DPOP_KEYTAG,
  regenerateCryptoKey,
} from "./crypto";
import { ITW_VERSION } from "./environment";

/**
 * Implements a flow to obtain a generic credential.
 * @param issuerConf - The resolved Issuer configuration (issuer trust already evaluated)
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialId - The id of the credential to obtain
 * @param credentialKeyTag - The key tag of the crypto key to bind to the credential
 * @param pid - The PID credential
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaSigner - The Wallet Instance Attestation signer
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
  pid,
  redirectUri,
  scope,
  walletInstanceAttestation,
  wiaSigner,
}: {
  batchSize?: number;
  credentialId: SupportedCredentialsWithoutPid;
  generateKeysWithAttestation: (
    keyTags: string[],
  ) => Promise<string | undefined>;
  issuerConf: CredentialIssuance.IssuerConfig;
  issuerState?: string;
  pid: PidResult;
  redirectUri: string;
  scope?: string;
  walletInstanceAttestation: string;
  wiaSigner: Signer;
}): Promise<CredentialResult> => {
  const wallet = new IoWallet({ version: ITW_VERSION });

  // Start user authorization
  const { clientId, codeVerifier, issuerRequestUri } =
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
        wiaSigner,
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
    [[createLocalSignerFor(pid.keyTag), pid.credential]],
  );

  // Complete the user authorization via form_post.jwt mode
  const { code } =
    await wallet.CredentialIssuance.completeUserAuthorizationWithFormPostJwtMode(
      requestObject,
      issuerConf,
      evaluatedDcqlQuery,
      { appFetch, wiaSigner },
    );

  // Generate the DPoP context which will be used for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopSigner = createLocalSignerFor(DPOP_KEYTAG);

  const { accessToken } = await wallet.CredentialIssuance.authorizeAccess(
    issuerConf,
    code,
    redirectUri,
    codeVerifier,
    {
      appFetch,
      dPopSigner,
      walletInstanceAttestation,
      wiaSigner,
    },
  );

  // For simplicity, in this example flow we work on a single credential.
  const [firstAuthorizationDetail] = accessToken.authorization_details;
  if (!firstAuthorizationDetail) {
    throw new Error("No authorization details found in the access token");
  }
  const { credential_configuration_id, credential_identifiers } =
    firstAuthorizationDetail;

  // Create as many key tags as the batch size
  const keyTags = Array.from({ length: batchSize }, () => uuidv4().toString());
  const keyAttestation = await generateKeysWithAttestation(keyTags);
  const credentialSigners = keyTags.map(createLocalSignerFor);

  const [firstCredentialSigner] = credentialSigners;
  if (!firstCredentialSigner) {
    throw new Error("No signer generated for the credential batch");
  }

  const [firstCredentialIdentifier] = credential_identifiers;
  if (!firstCredentialIdentifier) {
    throw new Error("No credential identifiers found in the access token");
  }

  const credentialDefinition = {
    credential_configuration_id,
    credential_identifier: firstCredentialIdentifier,
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
            credentialSigners,
            dPopSigner,
            keyAttestation,
          },
        )
      : await wallet.CredentialIssuance.obtainCredential(
          issuerConf,
          accessToken,
          clientId,
          credentialDefinition,
          {
            appFetch,
            credentialSigner: firstCredentialSigner,
            dPopSigner,
            keyAttestation,
          },
        );

  // In the example app we are not interested in storing the entire batch: it is sufficient
  // that the batch size is respected, so we return only the first credential for simplicity.
  // For production use cases, you should properly handle the entire batch.
  const [firstCredentialResult] = Array.isArray(credentialResult)
    ? credentialResult
    : [credentialResult];
  if (!firstCredentialResult) {
    throw new Error("No credential returned by the issuance flow");
  }
  const { credential, format } = firstCredentialResult;

  const credentialKeyTag = keyTags[0];
  if (!credentialKeyTag) {
    throw new Error("No key tag generated for the credential batch");
  }
  const credentialSigner = firstCredentialSigner;

  // Parse and verify the credential. The ignoreMissingAttributes flag must be set to false or omitted in production.
  const { parsedCredential } =
    await wallet.CredentialIssuance.verifyAndParseCredential(
      issuerConf,
      credential,
      credential_configuration_id,
      {
        credentialSigner,
        ignoreMissingAttributes: true,
      },
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
 * Get the status of a credential via the Token Status List.
 * @param env The environment variables
 * @param credentialType The type of the credential
 * @param credential The raw credential to obtain the status for
 * @param format The format of the credential
 * @returns The credential status
 */
export const getCredentialStatusFromStatusList = async (
  env: Env,
  credential: string,
  credentialType: string,
  format: CredentialIssuance.CredentialFormat,
) => {
  const wallet = new IoWallet({ version: ITW_VERSION });

  const keys = await getKeysForStatusListVerification(
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
  env: Env,
  credential: string,
  credentialType: string,
) => {
  if (credentialType === "keyAttestation") {
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

  const wallet = new IoWallet({ version: ITW_VERSION });
  const issuerUrl =
    credentialType === "PersonIdentificationData"
      ? env.WALLET_PID_PROVIDER_BASE_URL
      : env.WALLET_EAA_PROVIDER_BASE_URL;

  const { issuerConf } =
    await wallet.CredentialIssuance.evaluateIssuerTrust(issuerUrl);
  return issuerConf.keys;
};
