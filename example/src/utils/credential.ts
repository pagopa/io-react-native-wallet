import {
  Credential,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import uuid from "react-native-uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import appFetch from "../utils/fetch";
import type {
  CredentialResult,
  SupportedCredentialsWithoutPid,
} from "../store/types";
import {
  openAuthenticationSession,
  supportsInAppBrowser,
} from "@pagopa/io-react-native-login-utils";

/**
 * Implements a flow to obtain a generic credential.
 * @param credentialIssuerUrl - The credential issuer URL
 * @param redirectUri - The redirect URI for the authorization flow
 * @param credentialType - The type of the credential to obtain
 * @param walletInstanceAttestation - The Wallet Instance Attestation
 * @param wiaCryptoContext - The Wallet Instance Attestation crypto context
 * @param pid - The PID credential
 * @param pidCryptoContext - The PID credential crypto context
 * @returns The obtained credential result
 */
export const getCredential = async ({
  credentialIssuerUrl,
  redirectUri,
  credentialType,
}: {
  credentialIssuerUrl: string;
  redirectUri: string;
  credentialType: SupportedCredentialsWithoutPid;
}): Promise<CredentialResult[]> => {
  // Create credential crypto context
  const credentialKeyTag = uuid.v4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  // Start the issuance flow
  const startFlow: Credential.Issuance.StartFlow = () => ({
    issuerUrl: credentialIssuerUrl,
    credentialType,
  });

  const { issuerUrl } = startFlow();

  // Evaluate issuer trust
  const { issuerConf } = await Credential.Issuance.getIssuerConfig(issuerUrl);

  // Start user authorization

  // Obtain the Authorization URL
  const { authUrl, clientId, codeVerifier, credentialDefinition } =
    await Credential.Issuance.buildAuthorizationUrl(
      issuerConf,
      credentialType,
      {
        redirectUri,
        appFetch,
      }
    );

  const supportsCustomTabs = await supportsInAppBrowser();
  if (!supportsCustomTabs) {
    throw new Error("Custom tabs are not supported");
  }

  const baseRedirectUri = new URL(redirectUri).protocol.replace(":", "");

  // Open the authorization URL in the custom tab
  const authRedirectUrl = await openAuthenticationSession(
    authUrl,
    baseRedirectUri
  );

  const { code } =
    await Credential.Issuance.completeUserAuthorizationWithQueryMode(
      authRedirectUrl
    );
  /* End of temporary block code */

  const { accessToken } = await Credential.Issuance.authorizeAccess(
    issuerConf,
    code,
    clientId,
    redirectUri,
    codeVerifier,
    {
      appFetch,
    }
  );

  // Obtain the credential
  const { credentials, format } = await Credential.Issuance.obtainCredential(
    issuerConf,
    accessToken,
    clientId,
    credentialDefinition,
    {
      credentialCryptoContext,
      appFetch,
    }
  );

  return Promise.all(
    credentials.map(async (credentialResult) => {
      // Parse and verify the credential. The ignoreMissingAttributes flag must be set to false or omitted in production.
      const { parsedCredential } =
        await Credential.Issuance.verifyAndParseCredential(
          issuerConf,
          credentialResult.credential,
          format,
          credentialType,
          { credentialCryptoContext, ignoreMissingAttributes: true }
        );

      return {
        parsedCredential,
        credential: credentialResult.credential,
        keyTag: credentialKeyTag,
        credentialType,
      };
    })
  );
};
