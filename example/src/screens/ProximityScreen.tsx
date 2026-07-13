import { ModuleSummary } from "@pagopa/io-app-design-system";
import { Body, Alert as IOAlert, VStack } from "@pagopa/io-app-design-system";
import { ISO18013_5 } from "@pagopa/io-react-native-iso18013";
import { addPadding } from "@pagopa/io-react-native-jwt";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet } from "react-native";

import type { CredentialResult, EnvType } from "../store/types";

import { QrCodeImage } from "../components/QrCodeImage";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectWalletInstanceAttestationAsMdoc } from "../store/reducers/attestation";
import { selectCredential } from "../store/reducers/credential";
import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { useAppSelector } from "../store/utils";
import { getTrustAnchorX509Certificate } from "../utils/credential";
import { WIA_KEYTAG } from "../utils/crypto";
import { getEnv } from "../utils/environment";
import {
  type EventsPayload,
  generateAcceptedFields,
  requestBlePermissions,
  type RequestedDocument,
  type VerifierRequest,
  WELL_KNOWN_CREDENTIALS,
} from "../utils/proximity";

const {
  addListener,
  close,
  ErrorCode,
  generateResponse,
  getQrCodeString,
  parseEventError,
  parseVerifierRequest,
  removeListener,
  sendErrorResponse,
  sendResponse,
  start,
} = ISO18013_5;

/**
 * Proximity status enum to track the current state of the flow.
 * - STARTING: The flow is starting, permissions are being requested if necessary.
 * - STARTED: The flow has started, the QR code is being displayed.
 * - PRESENTING: The verifier app has requested a document, the user must decide whether to send it or not.
 * - STOPPED: The flow has been stopped, either by the user or due to an error.
 */
enum PROXIMITY_STATUS {
  PRESENTING = "PRESENTING",
  STARTED = "STARTED",
  STARTING = "STARTING",
  STOPPED = "STOPPED",
}

export const ProximityScreen = () => {
  const walletAttestationMdoc = useAppSelector(
    selectWalletInstanceAttestationAsMdoc,
  );
  const mDL = useAppSelector(selectCredential("mso_mdoc_mDL"));
  const env = useAppSelector(selectEnv);

  if (!walletAttestationMdoc || !mDL) {
    return <></>;
  }

  return (
    <ContentView
      attestation={walletAttestationMdoc}
      credential={mDL}
      env={env}
    />
  );
};

interface ContentViewProps {
  attestation: string;
  credential: CredentialResult;
  env: EnvType;
}

const ContentView = ({ attestation, credential, env }: ContentViewProps) => {
  const [status, setStatus] = useState<PROXIMITY_STATUS>(
    PROXIMITY_STATUS.STARTING,
  );
  const [qrCode, setQrCode] = useState<null | string>(null);
  const [request, setRequest] = useState<null | VerifierRequest["request"]>(
    null,
  );
  const [rpIsTrusted, setRpIsTrusted] = useState<boolean | null>(null);
  const { WALLET_TA_BASE_URL } = getEnv(env);
  const itwVersion = useAppSelector(selectItwVersion);

  useDebugInfo({
    attestation,
    credential,
  });

  /**
   * Callback function to handle device connection.
   * Currently does nothing but can be used to update the UI
   */
  const handleOnDeviceConnecting = () => {
    console.log("onDeviceConnecting");
  };

  /**
   * Callback function to handle device connection.
   * Currently does nothing but can be used to update the UI
   */
  const handleOnDeviceConnected = () => {
    console.log("onDeviceConnected");
  };

  /**
   * Sends the required document to the verifier app.
   * @param verifierRequest - The request object received from the verifier app
   */
  const sendDocument = async (verifierRequest: VerifierRequest["request"]) => {
    const documents: RequestedDocument[] = [
      {
        alias: WIA_KEYTAG,
        docType: WELL_KNOWN_CREDENTIALS.wia,
        issuerSignedContent: addPadding(attestation),
      },
      {
        alias: credential.keyTag,
        docType: WELL_KNOWN_CREDENTIALS.mdl,
        issuerSignedContent: addPadding(credential.credential),
      },
    ];

    /*
     * Generate the response to be sent to the verifier app. Currently we blindly accept all the fields requested by the verifier app.
     * In an actual implementation, the user would be prompted to accept or reject the requested fields and the `acceptedFields` object
     * must be generated according to the user's choice, setting the value to true for the accepted fields and false for the rejected ones.
     * See the `generateResponse` method for more details.
     */
    console.log("Generating response");
    const acceptedFields = generateAcceptedFields(verifierRequest);
    console.log(JSON.stringify(acceptedFields));
    console.log("Accepted fields:", JSON.stringify(acceptedFields));
    const generatedResponse = await generateResponse(documents, acceptedFields);
    console.log("Generated response:", generatedResponse);

    /**
     * Send the response to the verifier app.
     * Currently we don't know what the verifier app responds with, thus we don't handle the response.
     * We just wait for 2 seconds before closing the connection and resetting the QR code.
     * In order to start a new flow a new QR code must be generated.
     */
    console.log("Sending response to verifier app");
    await sendResponse(generatedResponse);

    console.log("Response sent");
  };

  /**
   * Close utility function to close the proximity flow.
   */
  const closeFlow = useCallback(async (sendError = false) => {
    try {
      if (sendError) {
        await sendErrorResponse(ErrorCode.SESSION_TERMINATED);
      }
      console.log("Cleaning up listeners and closing QR engagement");
      removeListener("onDeviceConnected");
      removeListener("onDeviceConnecting");
      removeListener("onDeviceDisconnected");
      removeListener("onDocumentRequestReceived");
      removeListener("onError");
      await close();
      setQrCode(null);
      setRequest(null);
      setRpIsTrusted(false);
      setStatus(PROXIMITY_STATUS.STOPPED);
    } catch (e) {
      console.log("Error closing the proximity flow", e);
    }
  }, []);

  /**
   * Callback function to handle device disconnection.
   */
  const onDeviceDisconnected = useCallback(async () => {
    console.log("onDeviceDisconnected");
    Alert.alert("Device disconnected", "Check the verifier app");
    await closeFlow();
  }, [closeFlow]);

  /**
   * Callback function to handle errors.
   * @param data The error data
   */
  const onError = useCallback(
    async (data: EventsPayload["onError"]) => {
      try {
        if (!data || !data.error) {
          throw new Error("No error data received");
        }
        const parsedError = parseEventError(data.error);
        console.error(`onError: ${parsedError}`);
      } catch (e) {
        console.error("Error parsing onError data:", e);
      } finally {
        // Close the flow on error
        await closeFlow();
      }
    },
    [closeFlow],
  );

  /**
   * Sends an error response to the verifier app during the presentation.
   * @param errorCode The error code to be sent
   */
  const sendError = useCallback(
    async (errorCode: (typeof ErrorCode)[keyof typeof ErrorCode]) => {
      try {
        console.log("Sending error response to verifier app");
        await sendErrorResponse(errorCode);
        setStatus(PROXIMITY_STATUS.STOPPED);
        console.log("Error response sent");
      } catch (error) {
        console.error("Error sending error response:", error);
        Alert.alert("Failed to send error response");
      }
    },
    [],
  );

  /**
   * Callback function to handle a new request received from the verifier app.
   * @param request The request object
   * @returns The response object
   * @throws Error if the request is invalid
   * @throws Error if the response generation fails
   */
  const onDocumentRequestReceived = useCallback(
    async (payload: EventsPayload["onDocumentRequestReceived"]) => {
      try {
        // A new request has been received
        console.log("onDocumentRequestReceived", payload);
        if (!payload || !payload.data) {
          console.warn("Request does not contain a message.");
          return;
        }

        // Parse and verify the received request with the exposed function
        const parsedJson = JSON.parse(payload.data);
        console.log("Parsed JSON:", parsedJson);
        const parsedRequest = parseVerifierRequest(parsedJson);
        console.log("Parsed request:", JSON.stringify(parsedRequest));
        const isTrusted = Object.values(parsedRequest.request).every(
          (item) => item.isAuthenticated,
        );
        console.log("RP is trusted:", isTrusted);
        setRequest(parsedRequest.request);
        setRpIsTrusted(isTrusted);
        setStatus(PROXIMITY_STATUS.PRESENTING);
      } catch (error) {
        console.error("Error handling new device request:", error);
        sendError(ErrorCode.SESSION_TERMINATED);
      }
    },
    [sendError],
  );

  /**
   * Start utility function to start the proximity flow.
   */
  const startFlow = useCallback(async () => {
    const x5c = [
      await getTrustAnchorX509Certificate(itwVersion, WALLET_TA_BASE_URL),
    ];

    setStatus(PROXIMITY_STATUS.STARTING);
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "BLE permissions are needed to proceed.",
      );
      setStatus(PROXIMITY_STATUS.STOPPED);
      return;
    }
    try {
      await start({
        certificates: [x5c],
      }); // Peripheral mode
      // Register listeners
      addListener("onDeviceConnecting", handleOnDeviceConnecting);
      addListener("onDeviceConnected", handleOnDeviceConnected);
      addListener("onDocumentRequestReceived", onDocumentRequestReceived);
      addListener("onDeviceDisconnected", onDeviceDisconnected);
      addListener("onError", onError);

      // Generate the QR code string
      console.log("Generating QR code");
      const qrString = await getQrCodeString();
      console.log(`Generated QR code: ${qrString}`);
      setQrCode(qrString);
      setStatus(PROXIMITY_STATUS.STARTED);
    } catch (error) {
      console.log("Error starting the proximity flow", error);
      Alert.alert("Failed to initialize QR engagement");
      setStatus(PROXIMITY_STATUS.STOPPED);
    }
  }, [
    WALLET_TA_BASE_URL,
    onDeviceDisconnected,
    onDocumentRequestReceived,
    onError,
    itwVersion,
  ]);

  /**
   * Starts the proximity flow and stops it on unmount.
   */
  useEffect(() => {
    startFlow();

    return () => {
      closeFlow();
    };
  }, [closeFlow, startFlow]);

  return (
    <SafeAreaView style={styles.container}>
      <VStack space={8}>
        {status === PROXIMITY_STATUS.STARTING && (
          <Body>Starting the proximity flow</Body>
        )}
        {status === PROXIMITY_STATUS.STARTED && qrCode && (
          <QrCodeImage correctionLevel="L" size={"60%"} value={qrCode} />
        )}
        {status === PROXIMITY_STATUS.PRESENTING && request && (
          <>
            <IOAlert
              content={rpIsTrusted ? "Trusted RP" : "Untrusted RP"}
              variant={rpIsTrusted ? "success" : "error"}
            />
            <ModuleSummary
              icon="documentAdd"
              label="Send document"
              onPress={() => sendDocument(request)}
            />
            <ModuleSummary
              icon="errorFilled"
              label={`Send error ${ErrorCode.CBOR_DECODING} (${
                ErrorCode[ErrorCode.CBOR_DECODING]
              })`}
              onPress={() => sendError(ErrorCode.CBOR_DECODING)}
            />
            <ModuleSummary
              icon="errorFilled"
              label={`Send error ${ErrorCode.SESSION_ENCRYPTION} (${
                ErrorCode[ErrorCode.SESSION_ENCRYPTION]
              })`}
              onPress={() => sendError(ErrorCode.SESSION_ENCRYPTION)}
            />
            <ModuleSummary
              icon="errorFilled"
              label={`Send error ${ErrorCode.SESSION_TERMINATED} (${
                ErrorCode[ErrorCode.SESSION_TERMINATED]
              })`}
              onPress={() => sendError(ErrorCode.SESSION_TERMINATED)}
            />
          </>
        )}
        {status === PROXIMITY_STATUS.STOPPED && (
          <ModuleSummary
            icon="qrCode"
            label="Generate QR Engagement"
            onPress={() => startFlow()}
          />
        )}
        {(status === PROXIMITY_STATUS.PRESENTING ||
          status === PROXIMITY_STATUS.STARTED) && (
          <ModuleSummary
            icon="logout"
            label={"Close QR Engagement"}
            onPress={() =>
              closeFlow(status === PROXIMITY_STATUS.PRESENTING ? true : false)
            }
          />
        )}
      </VStack>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#fff",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
});
