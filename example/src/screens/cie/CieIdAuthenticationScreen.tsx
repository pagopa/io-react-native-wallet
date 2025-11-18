import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { type WebViewNavigation } from "react-native-webview";
import {
  CieWebView,
  type CieWebViewError,
} from "../../components/cie/CieWebView";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { pidFlowReset } from "../../store/reducers/pid";
import { useAppDispatch } from "../../store/utils";
import { initPidMrtdChallengeThunk } from "../../thunks/mrtd";
import { continuePidFlowThunk } from "../../thunks/pid";

type ScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "CieIdAuthentication"
>;

export const CieIdAuthenticationScreen = ({
  route,
  navigation,
}: ScreenProps) => {
  const { authUrl, redirectUri, withDocumentProof } = route.params;
  const dispatch = useAppDispatch();

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
      navigation.goBack();
      dispatch(pidFlowReset());
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [navigation, dispatch]
  );

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <CieWebView
        style={styles.webview}
        source={{ uri: authUrl }}
        onNavigationStateChange={handleNavigationStateChange}
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
