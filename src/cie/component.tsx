import cieManager, { type Event as CEvent } from "@pagopa/react-native-cie";
import React, { createRef } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";

import type {
  WebViewErrorEvent,
  WebViewNavigationEvent,
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview/lib/WebViewTypes";
import { parseAuthRedirectUrl } from "../credential/issuance/04-complete-user-authorization";
const BASE_UAT_URL = "https://collaudo.idserver.servizicie.interno.gov.it/idp/";

/* To obtain the authentication URL on CIE L3 it is necessary to take the
 * link contained in the "Enter with CIE card reading" button.
 * This link can then be used on CieManager.
 * This javascript code takes the link in question and sends it to the react native function via postMessage
 */
const injectedJavaScript = `
    (function() {
      function sendDocumentContent() {
        const idpAuthUrl = [...document.querySelectorAll("a")]
        .filter(a => a.textContent.includes("lettura carta CIE"))
        .map(a=>a.href)[0];

        if(idpAuthUrl) {
          window.ReactNativeWebView.postMessage(idpAuthUrl);
        }
      }
      if (document.readyState === 'complete') {
        sendDocumentContent();
      } else {
        window.addEventListener('load', sendDocumentContent);
      }
    })();
    true;
  `;
export type OnSuccess = (code: string) => void;
export type OnError = (e: Error) => void;

type CIEParams = {
  authUrl: string;
  onSuccess: OnSuccess;
  onError: OnError;
  pin: string;
  useUat: boolean;
  redirectUrl: string;
};

/*
 * To make sure the server recognizes the client as valid iPhone device (iOS only) we use a custom header
 * on Android it is not required.
 */
const iOSUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";
const defaultUserAgent = Platform.select({
  ios: iOSUserAgent,
  default: undefined,
});

const webView = createRef<WebView>();

export const CieWebViewComponent = (params: CIEParams) => {
  const [webViewUrl, setWebViewUrl] = React.useState(params.authUrl);

  /*
   * Once the reading of the card with NFC is finished, it is necessary
   * to change the URL of the WebView by redirecting to the URL returned by
   * CieManager to allow the user to continue with the consent authorization
   * */

  const continueWithUrl: ContinueWithUrl = (callbackUrl: string) => {
    setWebViewUrl(callbackUrl);
  };

  // This function is called from the injected javascript code (postMessage). Which receives the authentication URL
  const handleMessage = async (event: WebViewMessageEvent) => {
    const cieAuthorizationUri = event.nativeEvent.data;
    const startCie = Platform.select({
      ios: startCieiOS,
      default: startCieAndroid,
    });
    await startCie(
      params.useUat,
      params.pin,
      params.onError,
      cieAuthorizationUri,
      continueWithUrl
    );
  };

  return (
    <WebView
      ref={webView}
      userAgent={defaultUserAgent}
      javaScriptEnabled={true}
      source={{ uri: webViewUrl }}
      onLoadEnd={handleOnLoadEnd(params.onError)}
      onError={handleOnError(params.onError)}
      onHttpError={handleOnError(params.onError)}
      injectedJavaScript={injectedJavaScript}
      onShouldStartLoadWithRequest={handleShouldStartLoading(
        params.onSuccess,
        params.redirectUrl
      )}
      onMessage={handleMessage}
    />
  );
};

//This function is called when authentication with CIE ends and the SP URL containing code and state is returned
const handleShouldStartLoading =
  (onSuccess: OnSuccess, redirectUrl: string) =>
  (event: WebViewNavigation): boolean => {
    if (event.url.includes(redirectUrl)) {
      const { code } = parseAuthRedirectUrl(event.url);
      onSuccess(code);
      return false;
    } else {
      return true;
    }
  };

const handleOnLoadEnd =
  (onError: OnError) => (e: WebViewNavigationEvent | WebViewErrorEvent) => {
    const eventTitle = e.nativeEvent.title.toLowerCase();
    if (
      eventTitle === "pagina web non disponibile" ||
      // On Android, if we attempt to access the idp URL twice,
      // we are presented with an error page titled "ERROR".
      eventTitle === "errore"
    ) {
      handleOnError(onError)(new Error(eventTitle));
    }
  };

const handleOnError =
  (onError: OnError) =>
  (e: any): void => {
    onError(e);
  };

const startCieAndroid = (
  useCieUat: boolean,
  ciePin: string,
  onError: OnError,
  cieAuthorizationUri: string,
  continueWithUrl: ContinueWithUrl
) => {
  try {
    cieManager
      .start()
      .then(async () => {
        cieManager.onEvent(handleCieEvent);
        cieManager.onError(onError);
        cieManager.onSuccess(handleCieSuccess(continueWithUrl));
        await cieManager.setPin(ciePin);
        cieManager.setAuthenticationUrl(cieAuthorizationUri);
        cieManager.setCustomIdpUrl(useCieUat ? getCieUatEndpoint() : null);
        await cieManager.startListeningNFC();
      })
      .catch(onError);
  } catch {
    onError(new Error("Unable to start CIE NFC manager on iOS"));
  }
};

type ContinueWithUrl = (callbackUrl: string) => void;

const startCieiOS = async (
  useCieUat: boolean,
  ciePin: string,
  onError: OnError,
  cieAuthorizationUri: string,
  continueWithUrl: ContinueWithUrl
) => {
  try {
    cieManager.removeAllListeners();
    cieManager.onEvent(handleCieEvent);
    cieManager.onError(onError);
    cieManager.onSuccess(handleCieSuccess(continueWithUrl));
    cieManager.enableLog(true);
    cieManager.setCustomIdpUrl(useCieUat ? getCieUatEndpoint() : null);
    await cieManager.setPin(ciePin);
    cieManager.setAuthenticationUrl(cieAuthorizationUri);
    cieManager
      .start()
      .then(async () => {
        await cieManager.startListeningNFC();
      })
      .catch(onError);
  } catch {
    onError(new Error("Unable to start CIE NFC manager on Android"));
  }
};

const handleCieEvent = (event: CEvent) => {
  console.log(`handleCieEvent: ${JSON.stringify(event)}`);
};

const handleCieSuccess =
  (continueWithUrl: ContinueWithUrl) => (url: string) => {
    continueWithUrl(decodeURIComponent(url));
  };

const getCieUatEndpoint = () =>
  Platform.select({
    ios: `${BASE_UAT_URL}Authn/SSL/Login2`,
    android: BASE_UAT_URL,
    default: null,
  });
