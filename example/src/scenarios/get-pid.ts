import {
  Credential,
  WalletInstanceAttestation,
  createCryptoContextFor,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import { openAuthenticationSession } from "@pagopa/io-react-native-login-utils";

import {
  REDIRECT_URI,
  WALLET_PID_PROVIDER_BASE_URL,
  WALLET_PROVIDER_BASE_URL,
} from "@env";
import uuid from "react-native-uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import { Alert } from "react-native";

export enum IdpHint {
  CIE = "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO",
  SPID = "https://demo.spid.gov.it",
}

export default (
    integrityContext: IntegrityContext,
    idphint: IdpHint = IdpHint.SPID
  ) =>
  async () => {
    try {
      // Obtain a wallet attestation. A wallet instance must be created before this step.
      const walletInstanceKeyTag = uuid.v4().toString();
      await generate(walletInstanceKeyTag);
      const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

      const walletInstanceAttestation =
        await WalletInstanceAttestation.getAttestation({
          wiaCryptoContext,
          integrityContext,
          walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
        });

      // Create identification context only for SPID
      const authorizationContext =
        idphint === IdpHint.SPID
          ? {
              authorize: openAuthenticationSession,
            }
          : undefined;

      // Create credential crypto context
      const credentialKeyTag = uuid.v4().toString();
      await generate(credentialKeyTag);
      const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

      // Start the issuance flow
      const startFlow: Credential.Issuance.StartFlow = () => ({
        issuerUrl: WALLET_PID_PROVIDER_BASE_URL,
        credentialType: "PersonIdentificationData",
      });

      const { issuerUrl, credentialType } = startFlow();

      // Evaluate issuer trust
      const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
        issuerUrl
      );

      console.log(JSON.stringify(issuerConf));

      // Start user authorization
      const { issuerRequestUri, clientId, codeVerifier, credentialDefinition } =
        await Credential.Issuance.startUserAuthorization(
          issuerConf,
          credentialType,
          {
            walletInstanceAttestation,
            redirectUri: `${REDIRECT_URI}`,
            wiaCryptoContext,
          }
        );

      const { code } =
        await Credential.Issuance.completeUserAuthorizationWithQueryMode(
          issuerRequestUri,
          clientId,
          issuerConf,
          idphint,
          REDIRECT_URI,
          authorizationContext
        );

      const { accessToken, tokenRequestSignedDPop } =
        await Credential.Issuance.authorizeAccess(
          issuerConf,
          code,
          clientId,
          REDIRECT_URI,
          codeVerifier,
          {
            walletInstanceAttestation,
            wiaCryptoContext,
          }
        );

      const { credential, format } = await Credential.Issuance.obtainCredential(
        issuerConf,
        accessToken,
        clientId,
        credentialDefinition,
        tokenRequestSignedDPop,
        {
          credentialCryptoContext,
        }
      );

      const { parsedCredential } =
        await Credential.Issuance.verifyAndParseCredential(
          issuerConf,
          credential,
          format,
          { credentialCryptoContext }
        );

      Alert.alert(`PID obtained!`, `${JSON.stringify(parsedCredential)}`, [
        { text: "OK" },
      ]);

      return result(parsedCredential);
    } catch (e) {
      console.error(e);
      return error(e);
    }
  };
