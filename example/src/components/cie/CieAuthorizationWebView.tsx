import React from "react";
import { type WebViewNavigation } from "react-native-webview";
import { CIE_L3_REDIRECT_URI } from "../../thunks/pid";
import { CieWebView, type CieWebViewError } from "./CieWebView";

type CieAuthorizationWebviewProps = {
  authorizationUrl: string;
  onAuthComplete: (url: string) => void;
  onError: (error: CieWebViewError) => void;
};

/**
 * Webview used to display to the user the authorization request after the CIE authentication
 */
export const CieAuthorizationWebview = (
  props: CieAuthorizationWebviewProps
) => {
  const handleShouldStartLoadWithRequest = (
    event: WebViewNavigation
  ): boolean => {
    if (event.url.includes(CIE_L3_REDIRECT_URI)) {
      props.onAuthComplete(event.url);
      return false;
    } else {
      return true;
    }
  };

  return (
    <CieWebView
      source={{ uri: props.authorizationUrl }}
      onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
      onWebViewError={props.onError}
    />
  );
};
