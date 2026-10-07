import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import URLParse from "url-parse";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { selectEnv } from "../../store/reducers/environment";
import { sessionSet } from "../../store/reducers/session";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { extractIoLoginToken, getIoLoginUri } from "../../utils/login";

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

  const handleNavigationStateChange = ({ url }: WebViewNavigation) => {
    const token = extractIoLoginToken(url);
    if (token) {
      dispatch(sessionSet({ loginMethod: "spid", token }));
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        allowsInlineMediaPlayback={true}
        androidCameraAccessDisabled={true}
        androidMicrophoneAccessDisabled={true}
        cacheEnabled={false}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={true}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoading}
        originWhitelist={originSchemasWhiteList}
        source={{
          uri: getIoLoginUri(env, idpParam, "SpidL2"),
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  item: {
    backgroundColor: "#5cfebe",
    marginHorizontal: 1,
    marginVertical: 1,
    padding: 2,
  },
  title: {
    fontSize: 24,
  },
  webview: { height: 800, width: 400 },
});
