import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  type WebViewMessageEvent,
  type WebViewNavigation,
} from "react-native-webview";
import { CieWebView, type CieWebViewError } from "./CieWebView";

// When authenticating with L3 directly, the injected JS does not work so `handleMessage` is never called
// To continue we must take the url with `OpenApp` (Android) or `authnRequestString` (iOS)
const isL3AuthUrl = (url: string) =>
  Platform.OS === "ios"
    ? url.includes("authnRequestString")
    : url.includes("OpenApp");

type CieAuthenticationWebviewProps = {
  authenticationUrl: string;
  onSuccess: (url: string) => void;
  onError: (error: CieWebViewError) => void;
};

/**
 * Webview used to fetch the authentication url to use a service provider for the CIE authentication
 * It displayes a loading spinner, with the webview working in the background
 */
export const CieAuthenticationWebview = (
  props: CieAuthenticationWebviewProps
) => {
  const handleMessage = async (event: WebViewMessageEvent) => {
    const url = event.nativeEvent.data;
    props.onSuccess(url);
  };

  const handleShouldStartLoadWithRequest = (
    event: WebViewNavigation
  ): boolean => {
    if (isL3AuthUrl(event.url)) {
      props.onSuccess(event.url);
      return false;
    }

    return true;
  };

  return (
    <View style={styles.invisible}>
      <CieWebView
        source={{ uri: props.authenticationUrl }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onWebViewError={props.onError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  invisible: { flex: 0 },
});
