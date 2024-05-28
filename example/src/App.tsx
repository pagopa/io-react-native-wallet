import { StyleSheet, ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaView } from "react-native-safe-area-context";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";

export default function App() {
  const [integrityContext, setIntegrityContext] = React.useState<
    IntegrityContext | undefined
  >();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <TestScenario
          title="Prepare Integrity Context"
          scenario={scenarios.prod.prepareIntegrityContext(setIntegrityContext)}
        />
        <TestScenario
          title="Create Wallet Instance"
          scenario={scenarios.prod.createWalletInstance(integrityContext)}
          disabled={!integrityContext}
        />

        <TestScenario
          title="Obtain Wallet Attestation"
          scenario={scenarios.prod.getAttestation(integrityContext)}
          disabled={!integrityContext}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    margin: 16,
  },
  title: {
    textAlign: "center",
    marginVertical: 8,
  },
  fixToText: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: "#737373",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
