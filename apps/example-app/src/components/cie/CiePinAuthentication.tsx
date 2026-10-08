import { H2, LoadingSpinner } from "@pagopa/io-app-design-system";
import { CieManager } from "@pagopa/io-react-native-cie";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type WebViewNavigation } from "react-native-webview";

import { CieAuthenticationWebview } from "./CieAuthenticationWebView";
import { CiePinDialog } from "./CiePinDialog";
import { CieReadingProgress } from "./CieReadingProgress";
import { CieWebView } from "./CieWebView";

interface CiePinAuthenticationProps {
  /** Custom IDP URL for the CIE reading, `undefined` to use the default PROD identity provider */
  customIdpUrl: string | undefined;
  /** Returns the URL which starts the CIE authentication, given the PIN inserted by the user */
  getAuthenticationUrl: (pin: string) => Promise<string>;
  onCancel: () => void;
  /**
   * Called for each navigation of the consent webview.
   * Must return `true` when the URL completes the flow, to stop the webview from loading it.
   */
  onConsentNavigation: (url: string) => boolean;
  onError: (error: unknown) => void;
}

/**
 * Shared CIE + PIN authentication flow, used both for the IO login and the PID issuance.
 *
 * 1. The user inserts the CIE PIN
 * 2. The authentication URL is loaded in a hidden webview to obtain the CIE reading URL
 * 3. The CIE is read via NFC, which returns the consent URL
 * 4. The consent URL is displayed until {@link CiePinAuthenticationProps.onConsentNavigation} completes the flow
 */
export const CiePinAuthentication = ({
  customIdpUrl,
  getAuthenticationUrl,
  onCancel,
  onConsentNavigation,
  onError,
}: CiePinAuthenticationProps) => {
  const [isPinInputVisible, setPinInputVisible] = useState(true);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState<string>();
  const [readingProgress, setReadingProgress] = useState<number>();
  const [authenticationUrl, setAuthenticationUrl] = useState<string>();
  const [consentUrl, setConsentUrl] = useState<string>();

  useEffect(() => {
    const cleanup = [
      CieManager.addListener("onEvent", (event) => {
        setText("I'm reading the CIE. Do not remove it from the device");
        setReadingProgress(event.progress);
      }),
      CieManager.addListener("onError", onError),
      CieManager.addListener("onSuccess", setConsentUrl),
    ];

    return () => {
      cleanup.forEach((remove) => remove());
      // `stopReading` is not exposed by the iOS native module, ignore the rejection
      CieManager.stopReading().catch(() => undefined);
    };
  }, [onError]);

  const handlePinConfirm = () => {
    if (pin.length === 8 && /^\d+$/.test(pin)) {
      setPinInputVisible(false);
      setIsLoading(true);
      getAuthenticationUrl(pin).then(setAuthenticationUrl).catch(onError);
    } else {
      Alert.alert(`❌ Invalid CIE PIN`);
    }
  };

  const handleReadingUrl = (url: string) => {
    // The webview might report the URL more than once, start reading only the first time
    if (!authenticationUrl) return;
    setAuthenticationUrl(undefined);
    setIsLoading(false);
    CieManager.setCustomIdpUrl(customIdpUrl);
    CieManager.startReading(pin, url);
    setText("Waiting for CIE card. Bring it closer to the NFC reader.");
  };

  const handleConsentNavigation = (event: WebViewNavigation): boolean =>
    !onConsentNavigation(event.url);

  return (
    <SafeAreaView style={styles.container}>
      <CiePinDialog
        onCancel={onCancel}
        onChangePin={setPin}
        onConfirm={handlePinConfirm}
        type="PIN"
        visible={isPinInputVisible}
      />
      {isLoading && (
        <View style={styles.progress}>
          <LoadingSpinner size={48} />
        </View>
      )}
      {authenticationUrl && (
        <CieAuthenticationWebview
          authenticationUrl={authenticationUrl}
          onError={onError}
          onSuccess={handleReadingUrl}
        />
      )}
      {consentUrl && (
        <View style={StyleSheet.absoluteFill}>
          <CieWebView
            onShouldStartLoadWithRequest={handleConsentNavigation}
            onWebViewError={onError}
            source={{ uri: consentUrl }}
          />
        </View>
      )}
      {/* Reading status, hidden once the webview is displayed to avoid overlapping it */}
      {!consentUrl && (
        <View style={styles.content}>
          {text && <H2 style={styles.text}>{text}</H2>}
          {readingProgress !== undefined && (
            <CieReadingProgress progress={readingProgress} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignContent: "center",
    alignItems: "center",
    gap: 16,
    height: "100%",
  },
  progress: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  text: {
    marginHorizontal: 24,
    marginTop: 64,
    textAlign: "center",
  },
});
