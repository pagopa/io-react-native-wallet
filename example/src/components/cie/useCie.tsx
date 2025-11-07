import { H2, H3 } from "@pagopa/io-app-design-system";
import { CieManager, type NfcError } from "@pagopa/io-react-native-cie";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  pidCiel3FlowReset,
  selectPidFlowParams,
} from "../../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  continuePidFlowThunk,
  preparePidFlowParamsThunk,
} from "../../thunks/pid";
import { CieAuthenticationWebview } from "./CieAuthenticationWebView";
import { CieAuthorizationWebview } from "./CieAuthorizationWebView";
import { CiePinDialog } from "./CiePinDialog";
import type { CieWebViewError } from "./CieWebView";

type UseCie = (
  /**
   * IDP hint for the authentication flow.
   * This is used to prepare the PID flow parameters.
   */
  idpHint: string
) => {
  /**
   * Components required to render the CIE flow instructions and webview.
   * This includes the PIN input dialog, the CIE authentication webview,
   * and the modal for displaying progress and errors.
   */
  components: JSX.Element;
  /**
   * Function to start the CIE identification process.
   * It resets the state and shows the PIN input dialog.
   */
  startCieIdentification: () => void;
};

/**
 * Custom hook to manage the CIE authentication flow.
 * It handles NFC reading, PIN input, and webview interactions.
 * @param idpHint The IDP hint for the authentication flow.
 * @returns An object containing components for rendering the CIE flow
 * and a function to start the CIE identification process.
 */
export const useCie: UseCie = (idpHint) => {
  const dispatch = useAppDispatch();
  const pidFlowParams = useAppSelector(selectPidFlowParams);

  const [isPinInputVisible, setPinInputVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalText, setModalText] = useState<string>();
  const [authorizationUrl, setAuthorizationUrl] = useState<string>();

  const resetState = useCallback(() => {
    setPinInputVisible(false);
    setIsModalVisible(false);
    setModalText(undefined);
    setAuthorizationUrl(undefined);
    dispatch(pidCiel3FlowReset());
    CieManager.stopReading();
  }, [dispatch]);

  const handleOnError = useCallback(
    (error: NfcError | CieWebViewError) => {
      resetState();
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [resetState]
  );

  useEffect(() => {
    const cleanup = [
      // Start listening for NFC events
      CieManager.addListener("onEvent", (event) => {
        console.log("CIE event:", event);
        setModalText(
          "I'm reading the CIE. Do not remove it from the device\n" +
            getProgressEmojis(event.progress)
        );
      }),
      // Start listening for errors
      CieManager.addListener("onError", (error) => {
        handleOnError(error);
      }),
      // Start listening for success
      CieManager.addListener("onSuccess", (url) => {
        setModalText("Continue to the webview");
        setAuthorizationUrl(url);
      }),
    ];

    return () => {
      // Remove the event listener on exit
      cleanup.forEach((remove) => remove());
      // Ensure the reading is stopped when component unmounts
      CieManager.stopReading();
    };
  }, [handleOnError]);

  const handlePinConfirm = () => {
    if (pin && pin.length === 8 && /^\d+$/.test(pin)) {
      setPinInputVisible(false);
      dispatch(
        preparePidFlowParamsThunk({
          idpHint,
          ciePin: pin,
        })
      );
    } else {
      Alert.alert(`❌ Invalid CIE PIN`);
    }
  };

  const handlePinClose = () => {
    resetState();
  };

  const startCieIdentification = () => {
    resetState();
    setPinInputVisible(true);
  };

  const handleAuthUrl = (url: string) => {
    if (pidFlowParams && pidFlowParams.ciePin) {
      CieManager.startReading(pidFlowParams.ciePin, url);
      setIsModalVisible(true);
      setModalText("Waiting for CIE card. Bring it closer to the NFC reader.");
    }
  };

  const handleAuthenticationComplete = (authRedirectUrl: string) => {
    setIsModalVisible(false);
    dispatch(continuePidFlowThunk({ authRedirectUrl }));
  };

  const handleCloseModal = () => {
    Alert.alert(`❌ Modal closed`);
    resetState();
  };

  const components = (
    <>
      <CiePinDialog
        visible={isPinInputVisible}
        onChangePin={setPin}
        onConfirm={handlePinConfirm}
        onCancel={handlePinClose}
      />
      {pidFlowParams && pidFlowParams.ciePin && (
        <CieAuthenticationWebview
          authenticationUrl={pidFlowParams.authUrl}
          onSuccess={handleAuthUrl}
          onError={handleOnError}
        />
      )}

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={resetState}
      >
        <SafeAreaView>
          <View style={styles.modal}>
            {modalText && <H2 style={styles.modalText}>{modalText}</H2>}
            <TouchableOpacity onPress={handleCloseModal}>
              <H3 style={styles.modalText}>Press to close</H3>
            </TouchableOpacity>
          </View>
          {authorizationUrl && (
            <View style={StyleSheet.absoluteFillObject}>
              <CieAuthorizationWebview
                authorizationUrl={authorizationUrl}
                onAuthComplete={handleAuthenticationComplete}
                onError={handleOnError}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );

  return { components, startCieIdentification };
};

/**
 * Get the progress emojis based on the reading progress.
 * @param progress The reading progress value from 0 to 1.
 * @returns A string representing the progress bar with emojis,
 */
export const getProgressEmojis = (progress: number) => {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  const totalDots = 12; // Length of the progress bar
  const blueDots = Math.floor(clampedProgress * totalDots);
  const whiteDots = totalDots - blueDots;

  const fullEmoji = "■";
  const emptyEmoji = "□";

  return fullEmoji.repeat(blueDots) + emptyEmoji.repeat(whiteDots);
};

const styles = StyleSheet.create({
  modal: {
    height: "100%",
    alignItems: "center",
    alignContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    gap: 16,
  },
  modalText: {
    marginTop: 64,
    marginHorizontal: 24,
    textAlign: "center",
    backgroundColor: "red",
  },
});
