import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import URLParse from "url-parse";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { selectEnv } from "../../store/reducers/environment";
import { sessionSet } from "../../store/reducers/session";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { getEnv } from "../../utils/environment";

type Props = NativeStackScreenProps<MainStackNavParamList, "IdpLogin">;

const originSchemasWhiteList = [
  "https://*",
  "intent://*",
  "http://*",
  "iologin://*",
];

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
 * IDP login screen which redirects the user to the IDP login page and handles the login flow.
 */
export default function IdpLoginScreen({ route }: Props) {
  const idpParam = route.params.idp;
  const dispatch = useAppDispatch();
  const env = useAppSelector(selectEnv);

  const handleShouldStartLoading = (event: WebViewNavigation): boolean => {
    const url = event.url;
    // if an intent is coming from the IDP login form, extract the fallbackUrl and use it in Linking.openURL
    const idpIntent = getIntentFallbackUrl(url);
    if (idpIntent) {
      Linking.openURL(idpIntent);
      return false;
    }
    return true;
  };

  const getLoginUri = useCallback(
    () => (idp: string) => {
      const { WALLET_PROVIDER_BASE_URL } = getEnv(env);
      let url = new URL(WALLET_PROVIDER_BASE_URL);
      url.pathname = `/login`;
      url.searchParams.append("entityID", idp);
      url.searchParams.append("authLevel", "SpidL2");
      return url.href;
    },
    [env]
  )();

  return (
    <View style={styles.container}>
      <WebView
        source={{
          uri: getLoginUri(idpParam),
        }}
        style={styles.webview}
        onNavigationStateChange={(el) => {
          if (el.url.includes("profile.html")) {
            const urlParams = new URL(el.url);
            const token = urlParams.searchParams.get("token");
            token && dispatch(sessionSet(token));
          }
        }}
        javaScriptEnabled={true}
        androidCameraAccessDisabled={true}
        androidMicrophoneAccessDisabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={true}
        originWhitelist={originSchemasWhiteList}
        cacheEnabled={false}
        onShouldStartLoadWithRequest={handleShouldStartLoading}
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
