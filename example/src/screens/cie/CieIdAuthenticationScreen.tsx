import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { isCieIdAvailable, openCieIdApp } from "@pagopa/io-react-native-cieid";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { type WebViewNavigation } from "react-native-webview";
import {
  CieWebView,
  type CieWebViewError,
} from "../../components/cie/CieWebView";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { selectEnv } from "../../store/reducers/environment";
import { pidFlowReset } from "../../store/reducers/pid";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { initPidMrtdChallengeThunk } from "../../thunks/mrtd";
import { continuePidFlowThunk } from "../../thunks/pid";
import { isAndroid, isIos } from "../../utils/device";

type ScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "CieIdAuthentication"
>;

const IO_LOGIN_CIE_SOURCE_APP = "iowallelogincie";
const IO_LOGIN_CIE_URL_SCHEME = `${IO_LOGIN_CIE_SOURCE_APP}:`;
const CIE_ID_ERROR = "cieiderror";
const CIE_ID_ERROR_MESSAGE = "cieid_error_message=";

const isAuthenticationUrl = (url: string) => {
  const authUrlRegex = /\/(livello[123]|nextUrl|openApp|app)(\/|\?|$)/;
  return authUrlRegex.test(url);
};

export const CieIdAuthenticationScreen = ({
  route,
  navigation,
}: ScreenProps) => {
  const env = useAppSelector(selectEnv);
  const isUat = env === "pre";

  const [finalAuthUrl, setFinalAuthUrl] = useState<string>();
  const { authUrl, redirectUri, withDocumentProof } = route.params;
  const dispatch = useAppDispatch();

  const goBackAndReset = useCallback(() => {
    navigation.goBack();
    dispatch(pidFlowReset());
  }, [navigation, dispatch]);

  const startCieIdAppAuthentication = (url: string) => {
    // Use the new CieID app-to-app flow on Android
    if (isAndroid) {
      openCieIdApp(
        url,
        (result) => {
          if (result.id === "ERROR") {
            Alert.alert("❌ CieID Error", result.code);
            return goBackAndReset();
          }
          setFinalAuthUrl(result.url);
        },
        isUat
      );
    }

    // Try to directly open the CieID app on iOS
    if (isIos) {
      Linking.openURL(`CIEID://${url}&sourceApp=${IO_LOGIN_CIE_SOURCE_APP}`);
    }
  };

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const { url } = navState;
    if (url.startsWith(redirectUri)) {
      try {
        if (withDocumentProof) {
          /**
           * If MRTD PoP is required, dispatch the initPidMrtdChallengeThunk to handle the MRTD PoP challenge.
           * The PID flow will continue after the MRTD PoP challenge is successfully verified.
           */
          dispatch(
            initPidMrtdChallengeThunk({
              authRedirectUrl: url,
            })
          );
        } else {
          dispatch(
            continuePidFlowThunk({
              authRedirectUrl: url,
            })
          );
        }

        navigation.goBack();
      } catch (error) {
        //In case of error, return to the previous screen
        navigation.goBack();
      }
    }
  };

  const handleOnError = useCallback(
    (error: CieWebViewError) => {
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
      goBackAndReset();
    },
    [goBackAndReset]
  );

  const handleShouldStartLoading = (event: WebViewNavigation): boolean => {
    const url = event.url;

    // When CieID is available, use a flow that launches the app
    if (isAuthenticationUrl(url) && isCieIdAvailable(isUat)) {
      startCieIdAppAuthentication(url);
      return false;
    }

    // When CieID is not available, fallback to the regular webview
    return true;
  };

  useEffect(() => {
    // Listen for a URL event to continue the flow. This is only needed on iOS,
    // as the CieID app is opened with the Linking module.
    const urlListenerSubscription = Linking.addEventListener(
      "url",
      ({ url }) => {
        if (!url.startsWith(IO_LOGIN_CIE_URL_SCHEME)) {
          return;
        }

        const [, continueUrl] = url.split(IO_LOGIN_CIE_URL_SCHEME);
        const cieIdError = continueUrl?.includes(CIE_ID_ERROR);

        if (cieIdError) {
          Alert.alert(
            `❌ CieID Error`,
            continueUrl?.split(CIE_ID_ERROR_MESSAGE)[1] ??
              "Unexpected error from CieID"
          );
          return goBackAndReset();
        }

        setFinalAuthUrl(continueUrl);
      }
    );

    return () => urlListenerSubscription.remove();
  }, [goBackAndReset]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <CieWebView
        style={styles.webview}
        source={{ uri: finalAuthUrl ?? authUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoading}
        onWebViewError={handleOnError}
        originWhitelist={["https://*", "intent://*", "http://*", redirectUri]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});
