import {
  IODSExperimentalContextProvider,
  ToastProvider,
} from "@pagopa/io-app-design-system";
import "react-native-url-polyfill/auto";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { DebugDataOverlay } from "./components/debug/DebugDataOverlay";
import { MainStackNavigator } from "./navigator/MainStackNavigator";
import { persistor, store } from "./store/store";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <IODSExperimentalContextProvider isExperimentaEnabled={true}>
            <SafeAreaProvider>
              <ToastProvider>
                <DebugDataOverlay />
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
