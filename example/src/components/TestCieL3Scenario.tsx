import { Cie } from "@pagopa/io-react-native-wallet";
import React, { useEffect } from "react";
import {
  View,
  Button,
  StyleSheet,
  Modal,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";

import {
  CIE_L3_REDIRECT_URI,
  continueCieL3FlowThunk,
  prepareCieL3FlowParamsThunk,
} from "../thunks/pidCieL3";
import { useAppDispatch, useAppSelector } from "../store/utilts";
import {
  pidCiel3FlowReset,
  selectPidCieL3FlowParams,
} from "../store/reducers/credential";
import type { WithAsyncState } from "../store/types";

export default function TestCieL3Scenario({
  title,
  idpHint,
  isCieUat,
  isDone,
  isLoading,
  hasError,
  isDisabled = false,
}: {
  title: string;
  idpHint: string;
  isCieUat: boolean;
  isDisabled?: boolean;
} & WithAsyncState) {
  const [result, setResult] = React.useState<string | undefined>();
  const [modalText, setModalText] = React.useState<string | undefined>();
  const [isModalVisible, setModalVisible] = React.useState(false);
  const [isHidden, setHidden] = React.useState(true);
  const dispatch = useAppDispatch();
  const flowParams = useAppSelector(selectPidCieL3FlowParams);

  useEffect(() => {
    if (hasError.status) {
      setResult(`❌ ${JSON.stringify(hasError.error)}`);
      setModalVisible(false);
    }
  }, [hasError]);

  useEffect(() => {
    if (isDone) {
      setResult(`✅`);
    }
  }, [isDone]);

  const handleOnSuccess = (url: string) => {
    dispatch(continueCieL3FlowThunk({ url }));
  };

  const handleOnError = (error: Cie.CieError) => {
    dispatch(pidCiel3FlowReset());
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

  const run = async () => {
    Alert.prompt(
      "CIE pin",
      "Enter your CIE pin",
      [
        {
          text: "OK",
          onPress: async (ciePin) => {
            if (ciePin && ciePin.length === 8 && /^\d+$/.test(ciePin)) {
              //Initialize params
              //Hide the webView for the first part of login then open modal
              setHidden(true);
              setModalVisible(true);
              setResult("⏱️");
              dispatch(prepareCieL3FlowParamsThunk({ idpHint, ciePin }));
            } else {
              setResult(`❌ Invalid CIE PIN`);
            }
          },
        },
      ],
      "secure-text"
    );
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
      <Button title={title} onPress={run} disabled={isLoading || isDisabled} />
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
                useUat={isCieUat}
                authUrl={flowParams.cieAuthUrl}
                onSuccess={handleOnSuccess}
                onEvent={handleOnEvent}
                onError={handleOnError}
                pin={flowParams.ciePin}
                redirectUrl={CIE_L3_REDIRECT_URI}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
