import { StyleSheet, ScrollView } from "react-native";
import scenarios, { TestScenario } from "./scenarios";
import React, { useEffect } from "react";
import "react-native-url-polyfill/auto";
import { SafeAreaView } from "react-native-safe-area-context";
import { generateHarwareKeyTag, getIntegrityContext } from "./contexts";
import type { IntegrityContext } from "@pagopa/io-react-native-wallet";

export default function App() {
  // const [deeplink, setDeeplink] = React.useState<string | undefined>();
  const [context, setContext] = React.useState<IntegrityContext | undefined>();

  const getContext = async () => {
    const hardwarekeyTag = await generateHarwareKeyTag();
    return getIntegrityContext(hardwarekeyTag);
  };

  useEffect(() => {
    getContext().then((ctx) => {
      setContext(ctx);
    });
    console.log("done");
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {context && (
        <ScrollView>
          <TestScenario
            title="Create Wallet Instance"
            scenario={scenarios.prod.createWalletInstance(context)}
          />

          <TestScenario
            title="Obtain Wallet Attestation"
            scenario={scenarios.prod.getAttestation(context)}
          />
        </ScrollView>
      )}
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
