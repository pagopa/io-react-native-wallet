import * as React from "react";
import {
  StyleSheet,
  View,
  Text,
  Button,
  SafeAreaView,
  Alert,
} from "react-native";
import scenarios, { type ScenarioRunner } from "./scenarios";

export default function App() {
  const [result, setResult] = React.useState<string | undefined>();

  React.useEffect(() => {
    setResult("READY");
  }, []);

  function run(runner: ScenarioRunner) {
    return async () => {
      const [error, result] = await runner();
      if (error) {
        showError(error);
      } else {
        setResult(result);
      }
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Button title="Decode PID" onPress={run(scenarios.decodePid)} />
        <Button title="Verify PID" onPress={run(scenarios.verifyPid)} />
        <Button title="Get WIA" onPress={run(scenarios.getAttestation)} />
        <Button title="Get PID" onPress={run(scenarios.getPid)} />
      </View>
      <View>
        <Text style={styles.title}>{result}</Text>
      </View>
    </SafeAreaView>
  );
}

const showError = (e: any) => {
  Alert.alert("Error!", JSON.stringify(e), [{ text: "OK" }]);
};
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
