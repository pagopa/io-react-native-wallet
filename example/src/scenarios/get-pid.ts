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
import type { PidContext } from "../MainComponent";
import appFetch from "../utils/fetch";

/**
 * Callback used to set the PID and its crypto context in the app state which is later used to obtain a credential
 */
export type PidSetter = React.Dispatch<
  React.SetStateAction<PidContext | undefined>
>;

export default (
    integrityContext: IntegrityContext,
    idphint: string,
    setPid: PidSetter
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
          appFetch,
        });

      // Create identification context only for SPID
      const authorizationContext = idphint.includes("servizicie")
        ? undefined
        : {
            authorize: openAuthenticationSession,
          };
      /*
       * Create credential crypto context for the PID
       * WARNING: The eID keytag must be persisted and later used when requesting a credential which requires a eID presentation
       */
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

      // Complete the authroization process with query mode with the authorizationContext which opens the browser
      const { code } =
        await Credential.Issuance.completeUserAuthorizationWithQueryMode(
          issuerRequestUri,
          clientId,
          issuerConf,
          idphint,
          REDIRECT_URI,
          authorizationContext
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

      // Obtain che eID credential
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

      // Parse and verify the eID credential
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

      // Setting the PID context in the app state in order to use it later to obtain a credential
      setPid({ pid: credential, pidCryptoContext: credentialCryptoContext });

      return result(parsedCredential);
    } catch (e) {
      console.error(e);
      return error(e);
    }
  };
