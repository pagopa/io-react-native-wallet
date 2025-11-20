import { H2 } from "@pagopa/io-app-design-system";
import { CieManager, type NfcError } from "@pagopa/io-react-native-cie";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { type WebViewNavigation } from "react-native-webview";
import { useSelector } from "react-redux";
import { CiePinDialog } from "../../components/cie/CiePinDialog";
import {
  CieWebView,
  type CieWebViewError,
} from "../../components/cie/CieWebView";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { pidFlowReset } from "../../store/reducers/pid";
import { useAppDispatch } from "../../store/utils";
import { validatePidMrtdChallengeThunk } from "../../thunks/mrtd";
import { continuePidFlowThunk } from "../../thunks/pid";
import { getProgressEmojis } from "../../utils/strings";
import {
  mrtdReset,
  selectMrtdAsyncStatus,
  selectMrtdChallengeCallbackUrl,
} from "./../../store/reducers/mrtd";

type ScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "CieInternalAuthentication"
>;

export const CieInternalAuthenticationScreen = ({
  route,
  navigation,
}: ScreenProps) => {
  const dispatch = useAppDispatch();
  const { challenge, redirectUri } = route.params;

  const [isCanInputVisible, setCanInputVisible] = useState(true);
  const [can, setCan] = useState("");
  const [text, setText] = useState<string>("Waiting for CAN input...");

  const callbackUrl = useSelector(selectMrtdChallengeCallbackUrl);
  const status = useSelector(selectMrtdAsyncStatus);

  useDebugInfo({
    challenge,
    redirectUri,
    callbackUrl,
    status,
  });

  const handleOnError = useCallback(
    (error: NfcError | CieWebViewError) => {
      navigation.goBack();
      dispatch(pidFlowReset());
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [navigation, dispatch]
  );

  useEffect(() => {
    const cleanup = [
      // Start listening for NFC events
      CieManager.addListener("onEvent", (event) => {
        setText(
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
        ({ mrtd_data, nis_data }) => {
          dispatch(
            validatePidMrtdChallengeThunk({
              mrtd: {
                dg1: mrtd_data.dg1,
                dg11: mrtd_data.dg11,
                sod_mrtd: mrtd_data.sod,
              },
              ias: {
                sod_ias: nis_data.sod,
                challenge_signed: nis_data.signedChallenge,
                ias_pk: nis_data.publicKey,
              },
            })
          );
        }
      ),
    ];

    return () => {
      dispatch(mrtdReset());
      // Remove the event listener on exit
      cleanup.forEach((remove) => remove());
      // Ensure the reading is stopped when component unmounts
      CieManager.stopReading();
    };
  }, [dispatch, navigation, handleOnError]);

  const handleCanConfirm = useCallback(() => {
    if (can && can.length === 6 && /^\d+$/.test(can)) {
      setCanInputVisible(false);
      setText("Waiting for the CIE");
      CieManager.startInternalAuthAndMRTDReading(can, challenge, "base64");
    } else {
      Alert.alert(`❌ Invalid CIE PIN`);
    }
  }, [can, challenge]);

  const handleCanClose = () => {
    dispatch(pidFlowReset());
    navigation.goBack();
  };

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const { url } = navState;
    if (url.startsWith(redirectUri)) {
      try {
        dispatch(
          continuePidFlowThunk({
            authRedirectUrl: url,
          })
        );
        navigation.goBack();
      } catch (error) {
        //In case of error, return to the previous screen
        navigation.goBack();
      }
    }
  };

  return (
    <SafeAreaView>
      <CiePinDialog
        type="CAN"
        visible={isCanInputVisible}
        onChangePin={setCan}
        onConfirm={handleCanConfirm}
        onCancel={handleCanClose}
      />
      <View style={styles.content}>
        {text && <H2 style={styles.text}>{text}</H2>}
      </View>
      {callbackUrl && (
        <View style={StyleSheet.absoluteFillObject}>
          <CieWebView
            source={{ uri: callbackUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onWebViewError={handleOnError}
            originWhitelist={[
              "https://*",
              "intent://*",
              "http://*",
              redirectUri,
            ]}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  progress: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    height: "100%",
    alignItems: "center",
    alignContent: "center",
    gap: 16,
  },
  text: {
    marginTop: 64,
    marginHorizontal: 24,
    textAlign: "center",
    backgroundColor: "red",
  },
});
