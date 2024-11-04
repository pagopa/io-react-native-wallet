import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import URLParse from "url-parse";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppDispatch } from "../../store/utils";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { pidCompleteFlowThunk } from "../../thunks/pid";

type Props = NativeStackScreenProps<MainStackNavParamList, "EIDLogin">;

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

export default function EIDLoginScreen({ route }: Props) {
  const { authUrl, issuerConf, clientId, codeVerifier, credentialDefinition } = route.params;
  const dispatch = useAppDispatch();

  const handleShouldStartLoading = (event: WebViewNavigation): boolean => {
    const url = event.url;
    console.log("WebView attempting to load URL:", url);
    const idpIntent = getIntentFallbackUrl(url);
    if (idpIntent) {
      Linking.openURL(idpIntent);
      return false;
    }
    return true;
  };

  // const handleNavigationStateChange = async (navState: WebViewNavigation) => {
  //   const { url } = navState;
  //   if (url.startsWith('YOUR_REDIRECT_URI')) {
  //     const code = new URL(url).searchParams.get('code');
  //     if (code) {
  //       try {
  //         const result = await dispatch(pidCompleteFlowThunk({
  //           code,
  //           issuerConf,
  //           clientId,
  //           redirectUri: 'YOUR_REDIRECT_URI',
  //           codeVerifier,
  //           credentialDefinition,
  //           walletInstanceAttestation: 'YOUR_WALLET_INSTANCE_ATTESTATION',
  //           wiaCryptoContext: 'YOUR_WIA_CRYPTO_CONTEXT',
  //           credentialType: 'PersonIdentificationData',
  //         })).unwrap();

  //       } catch (error) {
  //       }
  //     }
  //   }
  // };

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
        originWhitelist={originSchemasWhiteList}
        cacheEnabled={false}
        onShouldStartLoadWithRequest={handleShouldStartLoading}
        //onNavigationStateChange={handleNavigationStateChange}
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
