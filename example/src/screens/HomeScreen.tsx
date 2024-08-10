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

const HomeScreen = () => {
  const dispatch = useAppDispatch();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1 }}>
          <WalletInstanceScreen />
          <PidScreen />
          <CredentialScreen />
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
