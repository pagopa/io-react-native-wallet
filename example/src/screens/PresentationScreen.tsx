import React, { useCallback, useMemo } from "react";
import { Alert, FlatList, type ListRenderItemInfo } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import {
  selectMdocCredentialsForPresentation,
  selectPresentationAcceptanceState,
  selectPresentationRefusalState,
} from "../store/reducers/presentation";

import { useDebugInfo } from "../hooks/useDebugInfo";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { store } from "../store/store";

export const PresentationScreen = () => {
  const state = store.getState();
  const navigation = useNavigation();
  const { asyncStatus: acceptancePresentationState, ...presentationDetails } =
    useAppSelector(selectPresentationAcceptanceState);
  const { asyncStatus: refusalPresentationState } = useAppSelector(
    selectPresentationRefusalState
  );
  const mdocCredentials = selectMdocCredentialsForPresentation(state);

  useDebugInfo({
    acceptancePresentationState,
    refusalPresentationState,
    presentationDetails,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "Remote Cross-Device",
        onPress: () =>
          navigation.navigate("QrScanner", {
            mode: "presentation",
            presentationBehavior: "acceptanceState",
          }),
        isLoading: acceptancePresentationState.isLoading,
        hasError: acceptancePresentationState.hasError,
        isDone: acceptancePresentationState.isDone,
        icon: "qrCode",
        isPresent:
          !!presentationDetails.redirectUri ||
          acceptancePresentationState.isDone,
        successMessage: "OK",
      },
      {
        title: "Remote Cross-Device (Refuse)",
        onPress: () =>
          navigation.navigate("QrScanner", {
            mode: "presentation",
            presentationBehavior: "refusalState",
          }),
        isLoading: refusalPresentationState.isLoading,
        hasError: refusalPresentationState.hasError,
        isDone: refusalPresentationState.isDone,
        icon: "qrCode",
      },
      {
        title: "Proximity",
        onPress: () =>
          mdocCredentials.length === 1
            ? navigation.navigate("Proximity")
            : Alert.alert("Select a single MDOC credential for presentation"),
        isLoading: refusalPresentationState.isLoading,
        hasError: refusalPresentationState.hasError,
        isDone: refusalPresentationState.isDone,
        icon: "qrCode",
      },
    ],
    [
      navigation,
      mdocCredentials.length,
      acceptancePresentationState.hasError,
      acceptancePresentationState.isDone,
      acceptancePresentationState.isLoading,
      presentationDetails.redirectUri,
      refusalPresentationState.hasError,
      refusalPresentationState.isDone,
      refusalPresentationState.isLoading,
    ]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TestScenarioProp>) => (
      <TestScenario {...item} />
    ),
    []
  );

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item, index) => `${item.title}-${index}`}
      renderItem={renderItem}
      ItemSeparatorComponent={VSpacer}
    />
  );
};
