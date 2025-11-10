export const useCieProof = () => {};
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
import { CieAuthorizationWebview } from "../components/cie/CieAuthorizationWebView";
import { CiePinDialog } from "../components/cie/CiePinDialog";
import type { CieWebViewError } from "../components/cie/CieWebView";
import { mrtdReset, selectMrtdChallengeData } from "../store/reducers/mrtd";
import { pidFlowReset } from "../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getProgressEmojis } from "./useCie";

type UseCieChallengeSign = () => {
  /**
   * Components required to render the CIE flow instructions and webview.
   * This includes the CAN input dialog and the modal for displaying progress and errors.
   */
  components: JSX.Element;
};

/**
 * Custom hook to manage the CIE authentication flow.
 * It handles NFC reading and CAN input.
 * @returns An object containing components for rendering the CIE flow
 * and a function to start the CIE MRTD process.
 */
export const useCieChallengeSign: UseCieChallengeSign = () => {
  const dispatch = useAppDispatch();
  const { challenge } = useAppSelector(selectMrtdChallengeData());

  const [isPinInputVisible, setPinInputVisible] = useState(false);
  const [can, setCan] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalText, setModalText] = useState<string>();
  const [authorizationUrl, setAuthorizationUrl] = useState<string>();

  const resetState = useCallback(() => {
    setPinInputVisible(false);
    setIsModalVisible(false);
    setModalText(undefined);
    setAuthorizationUrl(undefined);
    dispatch(mrtdReset());
    dispatch(pidFlowReset());
    CieManager.stopReading();
  }, [dispatch]);

  const handleOnError = useCallback(
    (error: NfcError | CieWebViewError) => {
      resetState();
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [resetState]
  );

  const handleClose = useCallback(() => {
    Alert.alert(`❌ Challenge aborted`);
    resetState();
  }, [resetState]);

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
      CieManager.addListener(
        "onInternalAuthAndMRTDWithPaceSuccess",
        (url) => {}
      ),
    ];

    return () => {
      // Remove the event listener on exit
      cleanup.forEach((remove) => remove());
      // Ensure the reading is stopped when component unmounts
      CieManager.stopReading();
    };
  }, [handleOnError]);

  useEffect(() => {
    if (challenge) {
      setPinInputVisible(true);
    }
  }, [challenge, handleOnError]);

  const handlePinConfirm = async () => {
    if (challenge === undefined) {
      Alert.alert("❌ Missing MRTD Challenge");
      return;
    }

    if (!can || can.length !== 6 || !/^\d+$/.test(can)) {
      Alert.alert(`❌ Invalid CIE CAN`);
      return;
    }

    await CieManager.startInternalAuthAndMRTDReading(can, challenge, "base64");
    setPinInputVisible(false);
    setIsModalVisible(true);
    setModalText("Waiting for CIE card. Bring it closer to the NFC reader.");
  };

  const handleAuthenticationComplete = (authRedirectUrl: string) => {
    // TODO
  };

  const components = (
    <>
      <CiePinDialog
        type="CAN"
        visible={isPinInputVisible}
        onChangePin={setCan}
        onConfirm={handlePinConfirm}
        onCancel={handleClose}
      />
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={resetState}
      >
        <SafeAreaView>
          <View style={styles.modal}>
            {modalText && <H2 style={styles.modalText}>{modalText}</H2>}
            <TouchableOpacity onPress={handleClose}>
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

  return { components };
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
