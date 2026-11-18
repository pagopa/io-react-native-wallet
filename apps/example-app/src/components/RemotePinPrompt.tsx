import { H3, IOButton, VSpacer } from "@pagopa/io-app-design-system";
import React, { useEffect, useState } from "react";
import {
  Modal,
  TextInput as RNTextInput,
  StyleSheet,
  View,
} from "react-native";

import { subscribeToPinRequests } from "../utils/pinPrompt";

type Request = Parameters<Parameters<typeof subscribeToPinRequests>[0]>[0];

/**
 * Modal which asks the user for the Remote WSCD PIN whenever {@link requestRemotePin} is called.
 */
export const RemotePinPrompt = () => {
  const [request, setRequest] = useState<Request>();
  const [pin, setPin] = useState("");

  useEffect(() => subscribeToPinRequests(setRequest), []);

  const close = () => {
    setRequest(undefined);
    setPin("");
  };

  return (
    <Modal animationType="fade" transparent visible={!!request}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <H3>Remote WSCD PIN</H3>
          <VSpacer size={8} />
          <RNTextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onChangeText={setPin}
            placeholder="Enter the PIN"
            style={styles.input}
            value={pin}
          />
          <VSpacer size={8} />
          <IOButton
            disabled={!pin}
            label="Confirm"
            onPress={() => {
              request?.resolve(pin);
              close();
            }}
            variant="solid"
          />
          <VSpacer size={8} />
          <IOButton
            label="Cancel"
            onPress={() => {
              request?.reject(new Error("PIN entry cancelled"));
              close();
            }}
            variant="outline"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "100%",
  },
  input: {
    borderColor: "#0E0F13",
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
