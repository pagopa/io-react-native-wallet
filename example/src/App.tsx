import { ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";

export default function App() {
  const [integrityContext, setIntegrityContext] = React.useState<
    IntegrityContext | undefined
  >();

  return (
    <SafeAreaProvider>
      <SafeAreaView>
        <ScrollView>
          <TestScenario
            title="Prepare Integrity Context"
            scenario={scenarios.prepareIntegrityContext(setIntegrityContext)}
          />
          <TestScenario
            title="Create Wallet Instance"
            scenario={scenarios.createWalletInstance(integrityContext)}
            disabled={!integrityContext}
          />
          <TestScenario
            title="Obtain Wallet Attestation"
            scenario={scenarios.getAttestation(integrityContext)}
            disabled={!integrityContext}
          />
          <TestScenario
            title="Test Redirect"
            scenario={scenarios.testRedirect()}
          />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
