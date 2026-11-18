import {
  Body,
  H1,
  IOButton,
  IOVisualCostants,
  TextInput,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { TextInput as RNTextInput, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  loggingAddressSet,
  selectLoggingAddress,
} from "../store/reducers/environment";
import { remotePinSet, selectRemotePin } from "../store/reducers/user";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { validateLoggingAddress } from "../utils/environment";
import { initLogging } from "../utils/logging";

/**
 * Settings screen component which allows to set the logging server.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const currentDebugAddress = useAppSelector(selectLoggingAddress);
  const [debugAddress, setDebugAddress] = useState<string>(
    currentDebugAddress || "",
  );
  const remotePin = useAppSelector(selectRemotePin);
  const [pin, setPin] = useState("");
  const toast = useIOToast();

  const setRemotePin = () => {
    dispatch(remotePinSet(pin));
    setPin("");
    toast.success("Remote WSCD PIN set correctly");
  };

  const clearRemotePin = () => {
    dispatch(remotePinSet(""));
    toast.success("Remote WSCD PIN cleared");
  };

  const setLoggingServer = () => {
    try {
      validateLoggingAddress(debugAddress);
      dispatch(loggingAddressSet(debugAddress));
      initLogging(debugAddress);
      toast.success("Logging server set correctly");
    } catch {
      toast.error("Invalid logging server address");
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <VSpacer size={8} />
        <H1>Logging Server</H1>
        <VSpacer size={8} />
        <TextInput
          onChangeText={(test) => setDebugAddress(test)}
          placeholder={"http://example.com:8080/sendLogs"}
          value={debugAddress}
        />
        <VSpacer size={8} />
        <IOButton
          label="Set Logging Server"
          onPress={() => setLoggingServer()}
          variant="solid"
        />
        <VSpacer size={24} />
        <H1>Remote WSCD PIN</H1>
        <VSpacer size={8} />
        <Body>
          {remotePin ? "A PIN is currently set." : "No PIN is currently set."}
        </Body>
        <VSpacer size={8} />
        <RNTextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPin}
          placeholder="Enter the Remote WSCD PIN"
          style={styles.pinInput}
          value={pin}
        />
        <VSpacer size={8} />
        <IOButton
          disabled={!pin}
          label="Set PIN"
          onPress={setRemotePin}
          variant="solid"
        />
        <VSpacer size={8} />
        <IOButton
          disabled={!remotePin}
          label="Clear PIN"
          onPress={clearRemotePin}
          variant="outline"
        />
        <VSpacer size={24} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  pinInput: {
    borderColor: "#0E0F13",
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  safeArea: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: IOVisualCostants.appMarginDefault,
  },
});
