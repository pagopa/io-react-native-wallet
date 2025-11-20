import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import URLParse from "url-parse";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { useAppDispatch } from "../../store/utils";
import { initPidMrtdChallengeThunk } from "../../thunks/mrtd";
import { continuePidFlowThunk } from "../../thunks/pid";
import { defaultUserAgent } from "../../utils/useragent";

type Props = NativeStackScreenProps<MainStackNavParamList, "PidSpidLogin">;

export const getIntentFallbackUrl = (intentUrl: string): string | undefined => {
  const intentProtocol = URLParse.extractProtocol(intentUrl);
  if (intentProtocol.protocol !== "intent:" || !intentProtocol.slashes) {
    return undefined;
  }
  const hook = "S.browser_fallback_url=";
  const hookIndex = intentUrl.indexOf(hook);
  const endIndex = intentUrl.indexOf(";end", hookIndex + hook.length);
  if (hookIndex !== -1 && endIndex !== -1) {
    return intentUrl.substring(hookIndex + hook.length, endIndex);
  }
  return undefined;
};

/**
 * Screen to handle the PID authentication flow.
 * This screen uses a WebView to load the authentication URL and manage the
 * navigation state changes to intercept the redirect URL, completing the PID issuance flow.
 */
export default function PidSpidLoginScreen({ route, navigation }: Props) {
  const { authUrl, redirectUri, withDocumentProof } = route.params;
  const originSchemasWhiteList = [
    "https://*",
    "http://*",
    "intent://*",
    redirectUri,
  ];
  const dispatch = useAppDispatch();

  const handleShouldStartLoading = (event: WebViewNavigation): boolean => {
    const url = event.url;
    const idpIntent = getIntentFallbackUrl(url);
    if (idpIntent) {
      Linking.openURL(idpIntent);
      return false;
    }
    return true;
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

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: authUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        androidCameraAccessDisabled={true}
        androidMicrophoneAccessDisabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={true}
        originWhitelist={[...originSchemasWhiteList, redirectUri]}
        cacheEnabled={false}
        onShouldStartLoadWithRequest={handleShouldStartLoading}
        onNavigationStateChange={handleNavigationStateChange}
        userAgent={defaultUserAgent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  item: {
    backgroundColor: "#5cfebe",
    padding: 2,
    marginVertical: 1,
    marginHorizontal: 1,
  },
  title: {
    fontSize: 24,
  },
  webview: { width: 400, height: 800 },
});
