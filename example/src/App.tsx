import { StyleSheet, ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <TestScenario
          title="Create Wallet Instance"
          scenario={scenarios.createWalletInstance}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    margin: 15,
  },
});
