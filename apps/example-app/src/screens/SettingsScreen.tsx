import {
  H1,
  IOButton,
  IOVisualCostants,
  TextInput,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { credentialReset } from "../store/reducers/credential";
import {
  loggingAddressSet,
  selectLoggingAddress,
} from "../store/reducers/environment";
import { pidReset } from "../store/reducers/pid";
import { selectPid } from "../store/selectors/pid";
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
  const pid = useAppSelector(selectPid);
  const toast = useIOToast();
  const clearRemotePin = () => {
    // The PID key is bound to the PIN, so the PID and the credentials issued with it are discarded too
    dispatch(pidReset());
    dispatch(credentialReset());
    toast.success("PIN cleared");
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
        <IOButton
          disabled={!pid}
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
  safeArea: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: IOVisualCostants.appMarginDefault,
  },
});
