import { ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";
import { IdpHint } from "./scenarios/get-pid";

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
          {integrityContext && (
            <>
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
                title="Get PID (SPID DEMO)"
                scenario={scenarios.getPid(integrityContext, IdpHint.SPID)}
                disabled={!integrityContext}
              />
              <TestScenario
                title="Get PID (CIE DEMO)"
                scenario={scenarios.getPid(integrityContext, IdpHint.CIE)}
                disabled={!integrityContext}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
