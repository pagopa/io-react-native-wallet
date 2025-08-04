import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store";
import { MainStackNavigator } from "./navigator/MainStackNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  IODSExperimentalContextProvider,
  ToastProvider,
} from "@pagopa/io-app-design-system";
import { DebugDataOverlay } from "./components/debug/DebugDataOverlay";
import { StyleSheet } from "react-native";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <IODSExperimentalContextProvider isExperimentaEnabled={true}>
            <ToastProvider>
              <SafeAreaProvider>
                <DebugDataOverlay />
                <MainStackNavigator />
              </SafeAreaProvider>
            </ToastProvider>
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
