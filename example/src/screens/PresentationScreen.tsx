import React, { useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { selectPresentationAsyncStatus } from "../store/reducers/presentation";

import { useDebugInfo } from "../hooks/useDebugInfo";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { FlatList } from "react-native";

export const PresentationScreen = () => {
  const navigation = useNavigation();
  const presentationState = useAppSelector(selectPresentationAsyncStatus);

  useDebugInfo({
    presentationState,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "PID Remote Cross-Device",
        onPress: () =>
          navigation.navigate("QrScanner", {
            presentationAllowedBehavior: "ACCEPT",
          }),
        isLoading: presentationState.isLoading,
        hasError: presentationState.hasError,
        isDone: presentationState.isDone,
        icon: "device",
      },
      {
        title: "PID Remote Cross-Device (Refuse)",
        onPress: () =>
          navigation.navigate("QrScanner", {
            presentationAllowedBehavior: "REFUSE",
          }),
        isLoading: presentationState.isLoading,
        hasError: presentationState.hasError,
        isDone: presentationState.isDone,
        icon: "device",
      },
    ],
    [
      navigation,
      presentationState.hasError,
      presentationState.isDone,
      presentationState.isLoading,
    ]
  );

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item, index) => `${item.title}-${index}`}
      renderItem={({ item }) => (
        <>
          <TestScenario
            onPress={item.onPress}
            title={item.title}
            isLoading={item.isLoading}
            hasError={item.hasError}
            isDone={item.isDone}
            icon={item.icon}
            isPresent={item.isPresent}
          />
          <VSpacer />
        </>
      )}
    />
  );
};
