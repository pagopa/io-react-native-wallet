import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Provider } from "react-redux";

import MainComponent from "./MainComponent";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store";

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <MainComponent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
