import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import URLParse from "url-parse";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppDispatch } from "../../store/utils";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { continuePidFlowThunk } from "../../thunks/pid";

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
  const { authUrl, redirectUri } = route.params;
  const originSchemasWhiteList = ["https://*", "http://*", redirectUri];
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
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X; Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.93 Mobile Safari/537.36"
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
