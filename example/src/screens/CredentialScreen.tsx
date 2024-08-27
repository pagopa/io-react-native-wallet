import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  selectCredential,
  selectCredentialAsyncStatus,
} from "../store/reducers/credential";
import { getCredentialThunk } from "../thunks/credential";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { FlatList } from "react-native";
import { useDebugInfo } from "../hooks/useDebugInfo";

/**
 * Component (screen in a future PR) to test the credential functionalities.
 * This includes issuing a credential and getting its status attestation.
 */
export const CredentialScreen = () => {
  const dispatch = useAppDispatch();

  const mdlState = useAppSelector(selectCredentialAsyncStatus("MDL"));
  const mdl = useAppSelector(selectCredential("MDL"));

  const dcState = useAppSelector(
    selectCredentialAsyncStatus("EuropeanDisabilityCard")
  );
  const dc = useAppSelector(selectCredential("EuropeanDisabilityCard"));

  useDebugInfo({
    mdlState,
    mdl,
    dcState,
    dc,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "Get credential (MDL)",
        onPress: () => dispatch(getCredentialThunk({ credentialType: "MDL" })),
        isLoading: mdlState.isLoading,
        hasError: mdlState.hasError,
        isDone: mdlState.isDone,
        icon: "car",
        isPresent: !!mdl,
      },
      {
        title: "Get credential (DC)",
        onPress: () =>
          dispatch(
            getCredentialThunk({ credentialType: "EuropeanDisabilityCard" })
          ),
        isLoading: dcState.isLoading,
        hasError: dcState.hasError,
        isDone: dcState.isDone,
        icon: "accessibility",
        isPresent: !!dc,
      },
    ],
    [
      dc,
      dcState.hasError,
      dcState.isDone,
      dcState.isLoading,
      dispatch,
      mdl,
      mdlState.hasError,
      mdlState.isDone,
      mdlState.isLoading,
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
