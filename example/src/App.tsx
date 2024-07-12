import { ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";
import { IdpHint } from "./scenarios/get-pid";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

/**
 * PidContext is a tuple containing the PID and its crypto context.
 * It is used to obtain a credential and must be set after obtaining a PID.
 */
export type PidContext = { pid: string; pidCryptoContext: CryptoContext };

export default function App() {
  const [integrityContext, setIntegrityContext] = React.useState<
    IntegrityContext | undefined
  >();
  const [pidContext, setPidContext] = React.useState<PidContext>();

  return (
    <SafeAreaProvider>
      <SafeAreaView>
        <ScrollView>
          <TestScenario
            title="Prepare Integrity Context"
            scenario={scenarios.prepareIntegrityContext(setIntegrityContext)}
          />

          <>
            <TestScenario
              title="Create Wallet Instance"
              scenario={scenarios.createWalletInstance(integrityContext!)}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Obtain Wallet Attestation"
              scenario={scenarios.getAttestation(integrityContext!)}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Get PID (SPID DEMO)"
              scenario={scenarios.getPid(
                integrityContext!,
                IdpHint.SPID,
                setPidContext
              )}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Get PID (CIE DEMO)"
              scenario={scenarios.getPid(
                integrityContext!,
                IdpHint.CIE,
                setPidContext
              )}
              disabled={!integrityContext}
            />
            <TestScenario
              title="Get credential (mDL)"
              scenario={scenarios.getCredential(integrityContext!, pidContext!)}
              disabled={!integrityContext || !pidContext}
            />
          </>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
