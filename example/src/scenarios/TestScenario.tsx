import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { ScenarioRunner } from "./types";

export default function TestScenario({
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
  title: {
    textAlign: "center",
    marginVertical: 8,
  },
});
