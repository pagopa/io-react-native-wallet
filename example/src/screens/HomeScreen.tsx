/* eslint-disable react-native/no-inline-styles */
import React from "react";

import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { sessionReset } from "../store/reducers/sesssion";
import { WalletInstanceScreen } from "./WalletInstanceScreen";
import { PidScreen } from "./PidScreen";
import { CredentialScreen } from "./CredentialScreen";
import { useAppDispatch } from "../store/utilts";
import { StatusAttestationScreen } from "./StatusAttestationScreen";

/**
 * Home screen component which contains different sections to test the SDK functionalities.
 * This includes interacting with the wallet instance provider, issuing a PID and a credential, get their status attestation and more.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1 }}>
          <WalletInstanceScreen />
          <PidScreen />
          <CredentialScreen />
          <StatusAttestationScreen />
        </View>
        <TouchableOpacity
          onPress={() => dispatch(sessionReset())}
          style={{
            backgroundColor: "#ffa5a5",
            padding: 10,
            marginVertical: 1,
            marginHorizontal: 1,
            alignItems: "center",
          }}
        >
          <Text>Logout from IO backend</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
