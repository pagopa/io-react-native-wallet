import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import { Alert, FlatList, type ListRenderItemInfo } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectCredential } from "../store/reducers/credential";
import {
  selectPresentationAcceptanceState,
  selectPresentationRefusalState,
} from "../store/reducers/presentation";
import { useAppSelector } from "../store/utils";

export const PresentationScreen = () => {
  const navigation = useNavigation();
  const { asyncStatus: acceptancePresentationState, ...presentationDetails } =
    useAppSelector(selectPresentationAcceptanceState);
  const { asyncStatus: refusalPresentationState } = useAppSelector(
    selectPresentationRefusalState,
  );
  const mdoc_mDL = useAppSelector(selectCredential("mso_mdoc_mDL"));

  useDebugInfo({
    acceptancePresentationState,
    presentationDetails,
    refusalPresentationState,
  });

  const scenarios: TestScenarioProp[] = useMemo(
    () => [
      {
        hasError: acceptancePresentationState.hasError,
        icon: "qrCode",
        isDone: acceptancePresentationState.isDone,
        isLoading: acceptancePresentationState.isLoading,
        isPresent: acceptancePresentationState.isDone,
        onPress: () =>
          navigation.navigate("QrScanner", {
            mode: "presentation",
            presentationBehavior: "acceptanceState",
          }),
        successMessage: "OK",
        title: "PID Remote Cross-Device",
      },
      {
        hasError: refusalPresentationState.hasError,
        icon: "qrCode",
        isDone: refusalPresentationState.isDone,
        isLoading: refusalPresentationState.isLoading,
        isPresent: refusalPresentationState.isDone,
        onPress: () =>
          navigation.navigate("QrScanner", {
            mode: "presentation",
            presentationBehavior: "refusalState",
          }),
        successMessage: "OK",
        title: "PID Remote Cross-Device (Refuse)",
      },
      {
        hasError: refusalPresentationState.hasError,
        icon: "qrCode",
        isDone: refusalPresentationState.isDone,
        isLoading: refusalPresentationState.isLoading,
        onPress: () =>
          mdoc_mDL
            ? navigation.navigate("Proximity")
            : Alert.alert("Obtain a mDL first"),
        title: "mDL Proximity",
      },
    ],
    [
      navigation,
      mdoc_mDL,
      acceptancePresentationState.hasError,
      acceptancePresentationState.isDone,
      acceptancePresentationState.isLoading,
      refusalPresentationState.hasError,
      refusalPresentationState.isDone,
      refusalPresentationState.isLoading,
    ],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TestScenarioProp>) => (
      <TestScenario {...item} />
    ),
    [],
  );

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      ItemSeparatorComponent={VSpacer}
      keyExtractor={(item, index) => `${item.title}-${index}`}
      renderItem={renderItem}
    />
  );
};
