import React, { useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import {
  selectPresentationAcceptanceAsyncStatus,
  selectPresentationRefusalAsyncStatus,
} from "../store/reducers/presentation";

import { useDebugInfo } from "../hooks/useDebugInfo";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { FlatList } from "react-native";

export const PresentationScreen = () => {
  const navigation = useNavigation();
  const acceptancePresentationState = useAppSelector(
    selectPresentationAcceptanceAsyncStatus
  );
  const refusalPresentationState = useAppSelector(
    selectPresentationRefusalAsyncStatus
  );

  useDebugInfo({
    acceptancePresentationState,
    refusalPresentationState,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "PID Remote Cross-Device",
        onPress: () =>
          navigation.navigate("QrScanner", {
            presentationBehavior: "acceptanceState",
          }),
        isLoading: acceptancePresentationState.isLoading,
        hasError: acceptancePresentationState.hasError,
        isDone: acceptancePresentationState.isDone,
        icon: "device",
      },
      {
        title: "PID Remote Cross-Device (Refuse)",
        onPress: () =>
          navigation.navigate("QrScanner", {
            presentationBehavior: "refusalState",
          }),
        isLoading: refusalPresentationState.isLoading,
        hasError: refusalPresentationState.hasError,
        isDone: refusalPresentationState.isDone,
        icon: "device",
      },
    ],
    [
      navigation,
      acceptancePresentationState.hasError,
      acceptancePresentationState.isDone,
      acceptancePresentationState.isLoading,
      refusalPresentationState.hasError,
      refusalPresentationState.isDone,
      refusalPresentationState.isLoading,
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
