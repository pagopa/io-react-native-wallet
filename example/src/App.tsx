import {
  StyleSheet,
  View,
  Text,
  Button,
  Linking,
  ScrollView,
} from "react-native";
import scenarios, { type ScenarioRunner } from "./scenarios";
import React, { useEffect } from "react";
import "react-native-url-polyfill/auto";
import { encodeBase64 } from "@pagopa/io-react-native-jwt";
import { NavigationContainer } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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

  // useEffect(() => {
  //   Linking.getInitialURL()
  //     .then((url) => {
  //       if (url !== null) {
  //         setDeeplink(url);
  //       }
  //     })
  //     .catch((err) => console.error("An error occurred", err));

  //   let subcribtion = Linking.addEventListener("url", handleOpenURL);

  //   return () => {
  //     subcribtion.remove();
  //   };
  // });

  // function handleOpenURL(evt: { url: any }) {
  //   // Will be called when the notification is pressed foreground
  //   setDeeplink(evt.url);
  // }

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

function TestScenario({
  scenario,
  title = scenario.name,
}: {
  scenario: ScenarioRunner;
  title: string;
}) {
  const [result, setResult] = React.useState<string | undefined>();
  React.useEffect(() => {
    setResult("READY");
  }, []);

  function run(runner: ScenarioRunner) {
    return async () => {
      setResult("⏱️");
      const [error, _result] = await runner();
      if (error) {
        setResult(`❌ ${JSON.stringify(error)}`);
      } else {
        setResult("✅");
      }
    };
  }

  return (
    <View>
      <Button title={title} onPress={run(scenario)} />
      <Text style={styles.title}>{result}</Text>
    </View>
  );
}

// function TestSameDeviceFlowScenarioWithDeepLink({
//   deeplink,
// }: {
//   deeplink: string | undefined;
// }) {
//   const [result, setResult] = React.useState<string | undefined>();
//   React.useEffect(() => {
//     if (deeplink) {
//       run(encodeBase64(deeplink));
//     } else {
//       setResult("READY");
//     }
//   }, [deeplink]);

//   async function run(qrCode: string) {
//     setResult("⏱️... authenticating to RP via deep link");
//     const [error, _result] = await scenarios.poc.authenticationToRP(qrCode);
//     if (error) {
//       setResult(`❌ ${JSON.stringify(error)}`);
//     } else {
//       setResult("✅");
//     }
//   }

// const openBrowser = (url: string) => {
//   Linking.canOpenURL(url).then((supported) => {
//     if (supported) {
//       Linking.openURL(url);
//     } else {
//       console.log("Error during url opening: " + url);
//     }
//   });
// };

// return (
//   <View>
//     <Button
//       title={"Same device flow with deep link handler"}
//       onPress={() => {
//         openBrowser(
//           "https://demo.rp.eudi.wallet.developers.italia.it/saml2/login/"
//         );
//       }}
//     />
//     <Text style={styles.title}>{result}</Text>
//   </View>
// );
// }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
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
