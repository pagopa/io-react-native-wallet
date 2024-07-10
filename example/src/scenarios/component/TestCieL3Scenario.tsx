import {
  CieWebViewComponent,
  Credential,
  WalletInstanceAttestation,
  createCryptoContextFor,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";

import React from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { IdpHint } from "../get-pid";
import { generate } from "@pagopa/io-react-native-crypto";
import uuid from "react-native-uuid";
import { WALLET_PID_PROVIDER_BASE_URL, WALLET_PROVIDER_BASE_URL } from "@env";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

// This can be any URL, as long as it has http or https as its protocol, otherwise it cannot be managed by the webview.
const CIE_L3_REDIRECT_URI = "https://cie.callback";

type FlowParams = {
  cieAuthUrl: string;
  issuerConf: Parameters<Credential.Issuance.ObtainCredential>[0];
  clientId: string;
  codeVerifier: string;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
  credentialDefinition: Parameters<Credential.Issuance.ObtainCredential>[3];
};

export default function TestCieL3Scenario({
  integrityContext,
  title,
  ciePin,
  disabled = false,
}: {
  integrityContext: IntegrityContext;
  title: string;
  ciePin: string;
  disabled?: boolean;
}) {
  const [result, setResult] = React.useState<string | undefined>();
  const [flowParams, setFlowParams] = React.useState<FlowParams>();

  const handleOnSuccess = (code: string) => {
    continueFlow(code).catch((error) =>
      setResult(`❌ ${JSON.stringify(error)}`)
    );
  };

  const handleOnError = (error: Error) => {
    setResult(`❌ ${JSON.stringify(error)}`);
  };

  const prepareFlowParams = async () => {
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
          redirectUri: CIE_L3_REDIRECT_URI,
          wiaCryptoContext,
        }
      );

    const authzRequestEndpoint =
      issuerConf.oauth_authorization_server.authorization_endpoint;

    const params = new URLSearchParams({
      client_id: clientId,
      request_uri: issuerRequestUri,
      idphint: IdpHint.CIE,
    });

    return {
      cieAuthUrl: `${authzRequestEndpoint}?${params}`,
      issuerConf,
      clientId,
      codeVerifier,
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialDefinition,
    };
  };

  React.useEffect(() => {
    disabled ? setResult("DISABLED") : setResult("READY");
  }, [disabled]);

  const run = async () => {
    try {
      setResult("⏱️");
      const params = await prepareFlowParams();
      setFlowParams(params);
    } catch (error) {
      console.error(error);
      setResult(`❌ ${JSON.stringify(error)}`);
    }
  };

  const continueFlow = async (code: string) => {
    if (flowParams) {
      const {
        issuerConf,
        clientId,
        codeVerifier,
        walletInstanceAttestation,
        wiaCryptoContext,
        credentialDefinition,
      } = flowParams;

      // Create credential crypto context
      const credentialKeyTag = uuid.v4().toString();
      await generate(credentialKeyTag);
      const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

      const { accessToken, tokenRequestSignedDPop } =
        await Credential.Issuance.authorizeAccess(
          issuerConf,
          code,
          clientId,
          CIE_L3_REDIRECT_URI,
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

      setResult(`✅`);
      Alert.alert(`PID obtained!`, `${JSON.stringify(parsedCredential)}`, [
        { text: "OK" },
      ]);
    }
  };

  return (
    <View style={{ height: 300 }}>
      <Button title={title} onPress={run} disabled={disabled} />
      <Text style={styles.title}>{result}</Text>

      {flowParams && (
        <CieWebViewComponent
          useUat={true}
          authUrl={flowParams.cieAuthUrl}
          onSuccess={handleOnSuccess}
          onError={handleOnError}
          pin={ciePin}
          redirectUrl={CIE_L3_REDIRECT_URI}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: "center",
    marginVertical: 8,
  },
});
