import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { WithAsyncState } from "example/src/store/utilts";

export default function TestScenario({
  title,
  onPress,
  isDone,
  isLoading,
  hasError,
  isDisabled = false,
}: {
  title: string;
  onPress: () => void;
  isDisabled?: boolean;
} & WithAsyncState) {
  const [result, setResult] = React.useState<string | undefined>();

  useEffect(() => {
    if (hasError.status) {
      setResult(`❌ ${JSON.stringify(hasError.error)}`);
    }
  }, [hasError]);

  useEffect(() => {
    if (isDone) {
      setResult(`✅`);
    }
  }, [isDone]);

  function run() {
    setResult("⏱️");
    onPress();
  }

  return (
    <View>
      <View>
        <Button
          title={title}
          onPress={run}
          disabled={isLoading || isDisabled}
        />
        <Text style={styles.title}>{result}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: "center",
    marginVertical: 8,
  },
});
