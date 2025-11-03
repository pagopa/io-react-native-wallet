import { pipe } from "fp-ts/lib/function";
import React, { type ComponentProps, createRef } from "react";
import { Platform } from "react-native";
import WebView from "react-native-webview";
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigationEvent,
} from "react-native-webview/lib/WebViewTypes";

export type CieWebViewError = {
  name: "WEB_VIEW_ERROR";
  message: string;
};

const iOSUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";
const defaultUserAgent = Platform.select({
  ios: iOSUserAgent,
  default: undefined,
});

const AUTH_LINK_PATTERN = "lettura carta";

/**
 * To obtain the authentication URL on CIE L3 it is necessary to take the
 * link contained in the "Entra con lettura carta CIE" button.
 * This link can then be used on CieManager.
 * This javascript code takes the link in question and sends it to the react native function via postMessage
 */
const injectedJavaScript = `
    (function() {
      function sendDocumentContent() {
        const idpAuthUrl = [...document.querySelectorAll("a")]
        .filter(a => a.textContent.toLowerCase().includes("${AUTH_LINK_PATTERN}"))
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

type CieWebViewProps = ComponentProps<typeof WebView> & {
  onWebViewError: (error: CieWebViewError) => void;
};

/**
 * Base WebView component used for the CIE flow
 */
export const CieWebView = ({ onWebViewError, ...props }: CieWebViewProps) => {
  const webView = createRef<WebView>();

  const handleOnError = (
    err: WebViewErrorEvent | WebViewHttpErrorEvent | Error
  ): void =>
    pipe(
      err,
      (e) => {
        const error = e as Error;
        const webViewError = e as WebViewErrorEvent;
        const webViewHttpError = e as WebViewHttpErrorEvent;
        if (webViewHttpError.nativeEvent?.statusCode) {
          const { description, statusCode } = webViewHttpError.nativeEvent;
          return `WebView http error: ${description} with status code: ${statusCode}`;
        } else if (webViewError.nativeEvent) {
          const { code, description } = webViewError.nativeEvent;
          return `WebView error: ${description} with code: ${code}`;
        } else {
          return error.message || "An error occurred in the WebView";
        }
      },
      (message) =>
        onWebViewError({
          name: "WEB_VIEW_ERROR",
          message,
        })
    );

  const handleOnLoadEnd = (e: WebViewNavigationEvent | WebViewErrorEvent) => {
    const eventTitle = e.nativeEvent.title.toLowerCase();
    if (
      eventTitle === "pagina web non disponibile" ||
      // On Android, if we attempt to access the idp URL twice,
      // we are presented with an error page titled "ERROR".
      eventTitle.includes("errore")
    ) {
      handleOnError(new Error(eventTitle));
    }
  };

  return (
    <WebView
      {...props}
      ref={webView}
      userAgent={defaultUserAgent}
      javaScriptEnabled={true}
      injectedJavaScript={injectedJavaScript}
      onLoadEnd={handleOnLoadEnd}
      onError={handleOnError}
      onHttpError={handleOnError}
    />
  );
};
