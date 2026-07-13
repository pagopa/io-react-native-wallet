import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { H2, LoadingSpinner } from "@pagopa/io-app-design-system";
import { CieManager, type NfcError } from "@pagopa/io-react-native-cie";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";

import type { CieWebViewError } from "../../components/cie/CieWebView";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { CieAuthenticationWebview } from "../../components/cie/CieAuthenticationWebView";
import { CieAuthorizationWebview } from "../../components/cie/CieAuthorizationWebView";
import { CiePinDialog } from "../../components/cie/CiePinDialog";
import { selectEnv } from "../../store/reducers/environment";
import { pidFlowReset, selectPidFlowParams } from "../../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  continuePidFlowThunk,
  preparePidFlowParamsThunk,
} from "../../thunks/pid";
import { getCieIdpHint, getEnv } from "../../utils/environment";
import { getProgressEmojis } from "../../utils/strings";

type ScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "CieAuthentication"
>;

export const CieAuthenticationScreen = ({ navigation }: ScreenProps) => {
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);

  const pidFlowParams = useAppSelector(selectPidFlowParams);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinInputVisible, setPinInputVisible] = useState(true);
  const [pin, setPin] = useState("");
  const [text, setText] = useState<string>();
  const [authorizationUrl, setAuthorizationUrl] = useState<string>();

  const handleOnError = useCallback(
    (error: CieWebViewError | NfcError) => {
      navigation.goBack();
      dispatch(pidFlowReset());
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [navigation, dispatch],
  );

  useEffect(() => {
    const cleanup = [
      // Start listening for NFC events
      CieManager.addListener("onEvent", (event) => {
        setText(
          "I'm reading the CIE. Do not remove it from the device\n" +
            getProgressEmojis(event.progress),
        );
      }),
      // Start listening for errors
      CieManager.addListener("onError", (error) => {
        handleOnError(error);
      }),
      // Start listening for success
      CieManager.addListener("onSuccess", (url) => {
        setText("Continue to the webview");
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
      setIsLoading(true);
      dispatch(
        preparePidFlowParamsThunk({
          authMethod: "cieL3",
          ciePin: pin,
          idpHint: getCieIdpHint(env),
        }),
      );
    } else {
      Alert.alert(`❌ Invalid CIE PIN`);
    }
  };

  const handleAuthUrl = (url: string) => {
    if (pidFlowParams && pidFlowParams.ciePin) {
      setIsLoading(false);
      CieManager.setCustomIdpUrl(getEnv(env).CIE_CUSTOM_IDP_URL);
      CieManager.startReading(pidFlowParams.ciePin, url);
      setText("Waiting for CIE card. Bring it closer to the NFC reader.");
    }
  };

  const handleAuthenticationComplete = (authRedirectUrl: string) => {
    dispatch(continuePidFlowThunk({ authRedirectUrl }));
    navigation.goBack();
  };

  const handlePinClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView>
      <CiePinDialog
        onCancel={handlePinClose}
        onChangePin={setPin}
        onConfirm={handlePinConfirm}
        type="PIN"
        visible={isPinInputVisible}
      />
      {isLoading && (
        <View style={styles.progress}>
          <LoadingSpinner size={48} />
        </View>
      )}
      {pidFlowParams && pidFlowParams.ciePin && (
        <CieAuthenticationWebview
          authenticationUrl={pidFlowParams.authUrl}
          onError={handleOnError}
          onSuccess={handleAuthUrl}
        />
      )}
      {authorizationUrl && (
        <View style={StyleSheet.absoluteFillObject}>
          <CieAuthorizationWebview
            authorizationUrl={authorizationUrl}
            onAuthComplete={handleAuthenticationComplete}
            onError={handleOnError}
          />
        </View>
      )}
      <View style={styles.content}>
        {text && <H2 style={styles.text}>{text}</H2>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    alignContent: "center",
    alignItems: "center",
    gap: 16,
    height: "100%",
  },
  progress: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    backgroundColor: "red",
    marginHorizontal: 24,
    marginTop: 64,
    textAlign: "center",
  },
});
