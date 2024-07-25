import {
  Credential,
  WalletInstanceAttestation,
  createCryptoContextFor,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";
import {
  REDIRECT_URI,
  WALLET_EAA_PROVIDER_BASE_URL,
  WALLET_PROVIDER_BASE_URL,
} from "@env";
import uuid from "react-native-uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import { Alert } from "react-native";
import type { PidContext } from "../App";
import appFetch from "../utils/fetch";

export default (integrityContext: IntegrityContext, pidContext: PidContext) =>
  async () => {
    try {
      const { pid, pidCryptoContext } = pidContext;

      // Obtain a wallet attestation. A wallet instance must be created before this step.
      const walletInstanceKeyTag = uuid.v4().toString();
      await generate(walletInstanceKeyTag);
      const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

      const walletInstanceAttestation =
        await WalletInstanceAttestation.getAttestation({
          wiaCryptoContext,
          integrityContext,
          walletProviderBaseUrl: WALLET_PROVIDER_BASE_URL,
          appFetch,
        });

      // Create credential crypto context
      const credentialKeyTag = uuid.v4().toString();
      await generate(credentialKeyTag);
      const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

      // Start the issuance flow
      const startFlow: Credential.Issuance.StartFlow = () => ({
        issuerUrl: WALLET_EAA_PROVIDER_BASE_URL,
        credentialType: "MDL",
      });

      const { issuerUrl, credentialType } = startFlow();

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

      const { accessToken, dPoPContext } =
        await Credential.Issuance.authorizeAccess(
          issuerConf,
          code,
          clientId,
          REDIRECT_URI,
          codeVerifier,
          {
            walletInstanceAttestation,
            wiaCryptoContext,
            appFetch,
          }
        );

      // Obtain the credential
      const { credential, format } = await Credential.Issuance.obtainCredential(
        issuerConf,
        accessToken,
        clientId,
        credentialDefinition,
        dPoPContext,
        {
          credentialCryptoContext,
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

      Alert.alert(`MDL obtained!`, `${JSON.stringify(parsedCredential)}`, [
        { text: "OK" },
      ]);

      console.log(parsedCredential);

      return result(credential);
    } catch (e) {
      console.error(e);
      return error(e);
    }
  };