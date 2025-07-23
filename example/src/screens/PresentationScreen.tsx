import React, { useMemo } from "react";
import { Alert, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import {
  selectPresentationAcceptanceState,
  selectPresentationRefusalState,
} from "../store/reducers/presentation";
import { selectCredential } from "../store/reducers/credential";

import { useDebugInfo } from "../hooks/useDebugInfo";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";

export const PresentationScreen = () => {
  const navigation = useNavigation();
  const { asyncStatus: acceptancePresentationState, ...presentationDetails } =
    useAppSelector(selectPresentationAcceptanceState);
  const { asyncStatus: refusalPresentationState } = useAppSelector(
    selectPresentationRefusalState
  );
  const mdoc_mDL = useAppSelector(selectCredential("mso_mdoc_mDL"));

  useDebugInfo({
    acceptancePresentationState,
    refusalPresentationState,
    presentationDetails,
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
        icon: "qrCode",
        isPresent: !!presentationDetails.redirectUri,
        successMessage: "OK",
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
        icon: "qrCode",
      },
      {
        title: "mDL Proximity",
        onPress: () =>
          mdoc_mDL
            ? navigation.navigate("Proximity")
            : Alert.alert("Obtain a mDL first"),
        isLoading: refusalPresentationState.isLoading,
        hasError: refusalPresentationState.hasError,
        isDone: refusalPresentationState.isDone,
        icon: "qrCode",
      },
    ],
    [
      navigation,
      mdoc_mDL,
      acceptancePresentationState.hasError,
      acceptancePresentationState.isDone,
      acceptancePresentationState.isLoading,
      presentationDetails.redirectUri,
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
            successMessage={item.successMessage}
          />
          <VSpacer />
        </>
      )}
    />
  );
};
