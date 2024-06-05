import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import type { ScenarioRunner } from "../types";

export default function TestScenario({
  scenario,
  title = scenario.name,
  disabled = false,
}: {
  scenario: ScenarioRunner;
  title: string;
  disabled?: boolean;
}) {
  const [result, setResult] = React.useState<string | undefined>();
  React.useEffect(() => {
    disabled ? setResult("DISABLED") : setResult("READY");
  }, [disabled]);

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
      <Button title={title} onPress={run(scenario)} disabled={disabled} />
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
