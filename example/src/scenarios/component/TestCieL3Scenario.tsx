import {
  Cie,
  Credential,
  WalletInstanceAttestation,
  createCryptoContextFor,
  type IntegrityContext,
} from "@pagopa/io-react-native-wallet";

import React from "react";
import {
  View,
  Button,
  StyleSheet,
  Modal,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";

import { IdpHint } from "../get-pid";
import { generate } from "@pagopa/io-react-native-crypto";
import uuid from "react-native-uuid";
import { WALLET_PID_PROVIDER_BASE_URL, WALLET_PROVIDER_BASE_URL } from "@env";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import parseUrl from "parse-url";

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
  const [modalText, setModalText] = React.useState<string | undefined>();
  const [flowParams, setFlowParams] = React.useState<FlowParams>();
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [isHidden, setHidden] = React.useState(true);

  const handleOnSuccess = (url: string) => {
    try {
      const query = parseUrl(url).query;
      const { code } = Credential.Issuance.parseAuthroizationResponse(query);
      continueFlow(code);
    } catch (error) {
      setResult(`❌ ${error}`);
    } finally {
      setModalVisible(false);
    }
  };

  const handleOnError = (error: Cie.CieError) => {
    setModalVisible(false);
    setResult(`❌ ${error}`);
  };

  const handleOnEvent = (event: Cie.CieEvent) => {
    switch (event) {
      case Cie.CieEvent.waiting_card: {
        setModalText(
          "Waiting for CIE card. Bring it closer to the NFC reader."
        );
        break;
      }
      case Cie.CieEvent.completed: {
        setModalText("Continue to the webview");
        setHidden(false);
        break;
      }
      case Cie.CieEvent.reading: {
        setModalText("I'm reading the CIE. Do not remove it from the device");
        break;
      }
    }
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
      //Initialize params
      setFlowParams(undefined);
      //Hide the webView for the first part of login then open modal
      setHidden(true);
      setModalVisible(true);
      setResult("⏱️");
      const params = await prepareFlowParams();
      setFlowParams(params);
    } catch (error) {
      setResult(`❌ ${error}`);
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

  const toggleModal = () => {
    setModalText("");
    if (isModalVisible) {
      setResult(`❌ Modal closed`);
    }
    setModalVisible(!isModalVisible);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalText: {
      backgroundColor: "red",
      color: "white",
    },
    webviewContainer: {
      width: isHidden ? "0%" : "90%",
      height: isHidden ? "0%" : "80%",
      backgroundColor: "white",
      borderRadius: 10,
      overflow: "hidden",
    },
    closeButton: {
      padding: 10,
      backgroundColor: "#2196F3",
    },
    closeButtonText: {
      color: "white",
      textAlign: "center",
    },
    webview: {
      flex: 1,
    },
    title: {
      textAlign: "center",
      marginVertical: 8,
    },
  });

  return (
    <View>
      <Button title={title} onPress={run} disabled={disabled} />
      <Text style={styles.title}>{result}</Text>

      {flowParams && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={toggleModal}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{modalText}</Text>
            <View style={styles.webviewContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={toggleModal}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <Cie.WebViewComponent
                useUat={true}
                authUrl={flowParams.cieAuthUrl}
                onSuccess={handleOnSuccess}
                onEvent={handleOnEvent}
                onError={handleOnError}
                pin={ciePin}
                redirectUrl={CIE_L3_REDIRECT_URI}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
