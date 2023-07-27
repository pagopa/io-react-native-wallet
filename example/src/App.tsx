import * as React from "react";
import { StyleSheet, View, Text, Button, SafeAreaView } from "react-native";
import scenarios, { type ScenarioRunner } from "./scenarios";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <TestScenario title="Decode PID" scenario={scenarios.decodePid} />
      <TestScenario title="Verify PID" scenario={scenarios.verifyPid} />
      <TestScenario title="Get WIA" scenario={scenarios.getAttestation} />
      <TestScenario title="Get PID" scenario={scenarios.getPid} />
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
