import React from "react";
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { idps } from "../utils/idps";
import { WALLET_PROVIDER_BASE_URL } from "@env";
import URLParse from "url-parse";
import { sessionSet } from "../store/reducers/sesssion";
import { useAppDispatch } from "../store/dispatch";

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

const IdpButton = ({
  idp,
  onPress,
}: {
  idp: (typeof idps)[number];
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity onPress={() => onPress(idp.id)} style={[styles.item]}>
    <Text style={[styles.title]}>{idp.name}</Text>
  </TouchableOpacity>
);

const getLoginUri = (idp: string) => {
  let url = new URL(WALLET_PROVIDER_BASE_URL);
  url.pathname = `/login`;
  url.searchParams.append("entityID", idp);
  url.searchParams.append("authLevel", "SpidL2");
  return url.href;
};

export default function LoginScreen() {
  const [idp, setIdp] = React.useState<string | undefined>();
  const dispatch = useAppDispatch();

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

  return (
    <View style={styles.container}>
      {idp ? (
        <WebView
          source={{
            uri: getLoginUri(idp),
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
      ) : (
        <FlatList
          ListHeaderComponent={<Text>Login to IO backend with your IDP</Text>}
          data={idps}
          renderItem={(list) => (
            <IdpButton
              idp={list.item}
              onPress={(id: string) => {
                setIdp(id);
              }}
            />
          )}
        />
      )}
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
