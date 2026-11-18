import {
  IODSExperimentalContextProvider,
  ToastProvider,
} from "@pagopa/io-app-design-system";
import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Linking, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { DebugDataOverlay } from "./components/debug/DebugDataOverlay";
import { RemotePinPrompt } from "./components/RemotePinPrompt";
import {
  MainStackNavigator,
  navigationReady,
  navigationRef,
} from "./navigator/MainStackNavigator";
import { persistor, store } from "./store/store";
import { remoteCrossDevicePresentationThunk } from "./thunks/presentation";

const OPENID4VP_SCHEME = "openid4vp://";

const handleDeepLink = async (url: null | string) => {
  if (url?.startsWith(OPENID4VP_SCHEME)) {
    await navigationReady;
    navigationRef.navigate("Presentations");
    store.dispatch(
      remoteCrossDevicePresentationThunk({
        allowed: "acceptanceState",
        qrcode: url,
      }),
    );
  }
};

// Rendered inside PersistGate, so links are handled only after the store is rehydrated
const DeepLinkHandler = () => {
  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink);
    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleDeepLink(url),
    );
    return () => subscription.remove();
  }, []);

  return null;
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <IODSExperimentalContextProvider isExperimentaEnabled={true}>
            <SafeAreaProvider>
              <ToastProvider>
                <DebugDataOverlay />
                <RemotePinPrompt />
                <DeepLinkHandler />
                <MainStackNavigator />
              </ToastProvider>
            </SafeAreaProvider>
          </IODSExperimentalContextProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
