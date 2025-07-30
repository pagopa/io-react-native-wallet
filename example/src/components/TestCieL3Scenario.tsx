import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";
import { CIE_L3_REDIRECT_URI, continuePidFlowThunk } from "../thunks/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { pidCiel3FlowReset } from "../store/reducers/pid";
import type { AsyncStatus } from "../store/types";
import {
  ModuleCredential,
  useIOToast,
  type Badge,
  type IOIcons,
} from "@pagopa/io-app-design-system";
import { selectPidFlowParams } from "../store/reducers/pid";
import { preparePidFlowParamsThunk } from "../thunks/pid";
import { CieEvent, WebViewComponent, type CieError } from "./cie";
import { PinDialog } from "./cie/PinDialog";

export type TestCieL3ScenarioProps = {
  title: string;
  idpHint: string;
  isCieUat: boolean;
  icon: IOIcons;
  isPresent?: boolean;
} & AsyncStatus;

export default function TestCieL3Scenario({
  title,
  idpHint,
  isCieUat,
  isLoading,
  hasError,
  icon,
  isPresent = false,
}: TestCieL3ScenarioProps) {
  const [modalText, setModalText] = useState<string | undefined>();
  const [showDialog, setShowDialog] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isHidden, setHidden] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false); // This in needed to avoid the error toast to be shown on the first render
  const [pin, setPin] = useState("");
  const dispatch = useAppDispatch();
  const flowParams = useAppSelector(selectPidFlowParams);
  const toast = useIOToast();

  useEffect(() => {
    if (hasError.status && hasLoaded) {
      toast.error(`An error occured, check the debug info`);
      setHasLoaded(false);
    }
  }, [hasError, hasLoaded, toast]);

  useEffect(() => {
    if (isLoading) {
      setHasLoaded(true);
    }
  }, [isLoading]);

  const handleOnSuccess = (url: string) => {
    dispatch(continuePidFlowThunk({ authRedirectUrl: url }));
  };

  const handleOnError = (error: CieError) => {
    dispatch(pidCiel3FlowReset());
    setModalVisible(false);
    Alert.alert(`❌ ${JSON.stringify(error)}`);
  };

  const handleOnEvent = (event: CieEvent) => {
    switch (event) {
      case CieEvent.waiting_card: {
        setModalText(
          "Waiting for CIE card. Bring it closer to the NFC reader."
        );
        break;
      }
      case CieEvent.completed: {
        setModalText("Continue to the webview");
        setHidden(false);
        break;
      }
      case CieEvent.reading: {
        setModalText("I'm reading the CIE. Do not remove it from the device");
        break;
      }
    }
  };

  const run = async () => {
    setHasLoaded(true);
    setShowDialog(true);
    // Alert.prompt(
    //   "CIE pin",
    //   "Enter your CIE pin",
    //   [
    //     {
    //       text: "OK",
    //       onPress: async (ciePin) => {
    //         if (ciePin && ciePin.length === 8 && /^\d+$/.test(ciePin)) {
    //           //Initialize params
    //           //Hide the webView for the first part of login then open modal
    //         } else {
    //           Alert.alert(`❌ Invalid CIE PIN`);
    //         }
    //       },
    //     },
    //   ],
    //   "secure-text"
    // );
  };
  const handleConfirm = () => {
    if (pin && pin.length === 8 && /^\d+$/.test(pin)) {
      //Initialize params
      //Hide the webView for the first part of login then open modal
      setHidden(true);
      setModalVisible(true);
      dispatch(
        preparePidFlowParamsThunk({
          idpHint,
          authMethod: "cieL3",
          ciePin: pin,
        })
      );
      setShowDialog(false);
    } else {
      Alert.alert(`❌ Invalid CIE PIN`);
    }
  };

  const handleClose = () => {
    setPin("");
    setShowDialog(false);
  };

  const toggleModal = () => {
    setModalText("");
    if (isModalVisible) {
      Alert.alert(`❌ Modal closed`);
    }
    setModalVisible(!isModalVisible);
    dispatch(pidCiel3FlowReset());
  };

  const getBadge = useCallback((): Badge | undefined => {
    if (isPresent) {
      return { text: "OBTAINED", variant: "success" };
    } else if (hasError.status) {
      return { text: "ERROR", variant: "error" };
    } else {
      return undefined;
    }
  }, [hasError, isPresent]);

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
      <ModuleCredential
        label={title}
        icon={icon}
        onPress={run}
        isFetching={isLoading}
        badge={getBadge()}
      />
      <PinDialog
        visible={showDialog}
        onConfirm={handleConfirm}
        onChangePin={setPin}
        onCancel={handleClose}
      />
      {flowParams && flowParams.ciePin && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={toggleModal}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{modalText}</Text>
            <TouchableOpacity onPress={toggleModal}>
              <Text style={styles.modalText}>Press to close</Text>
            </TouchableOpacity>
            <View style={styles.webviewContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={toggleModal}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <WebViewComponent
                useUat={isCieUat}
                authUrl={flowParams.authUrl}
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
