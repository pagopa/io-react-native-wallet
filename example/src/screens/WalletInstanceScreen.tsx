import React, { useMemo } from "react";
import { createWalletInstanceThunk } from "../thunks/instance";
import { useAppDispatch, useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import {
  instanceReset,
  selectHasInstanceKeyTag,
  selectInstanceAsyncStatus,
  selectInstanceKeyTag,
} from "../store/reducers/instance";
import {
  selectAttestation,
  selectAttestationAsyncStatus,
} from "../store/reducers/attestation";
import { getAttestationThunk } from "../thunks/attestation";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { Alert, FlatList } from "react-native";

/**
 * Component (screen in a future PR) to test the wallet instance functionalities.
 * This includes creating a wallet instance and getting an attestation.
 */
export const WalletInstanceScreen = () => {
  const dispatch = useAppDispatch();
  const instanceState = useAppSelector(selectInstanceAsyncStatus);
  const attestationState = useAppSelector(selectAttestationAsyncStatus);
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  const instanceKeyTag = useAppSelector(selectInstanceKeyTag);
  const attestation = useAppSelector(selectAttestation);

  useDebugInfo({
    instanceState,
    instanceKeyTag,
    attestationState,
    attestation,
  });

  const scenarios: Array<TestScenarioProp> = useMemo(
    () => [
      {
        title: "Create Wallet Instance",
        onPress: () => {
          if (hasIntegrityKeyTag) {
            Alert.alert(
              "Wallet instance already exits",
              "This will reset the whole app state except the session",
              [
                {
                  text: "Ok",
                  onPress: () => {
                    dispatch(instanceReset());
                    dispatch(createWalletInstanceThunk());
                  },
                  style: "destructive",
                },
                {
                  text: "Cancel",
                  onPress: () => console.log("Cancel Pressed"),
                  style: "cancel",
                },
              ]
            );
          }
        },
        isLoading: instanceState.isLoading,
        hasError: instanceState.hasError,
        isDone: instanceState.isDone,
        icon: "device",
        isPresent: hasIntegrityKeyTag,
      },
      {
        title: "Get Attestation",
        onPress: () => dispatch(getAttestationThunk()),
        isLoading: attestationState.isLoading,
        hasError: attestationState.hasError,
        isDone: attestationState.isDone,
        icon: "bonus",
        isPresent: !!attestation,
      },
    ],
    [
      attestation,
      attestationState.hasError,
      attestationState.isDone,
      attestationState.isLoading,
      dispatch,
      hasIntegrityKeyTag,
      instanceState.hasError,
      instanceState.isDone,
      instanceState.isLoading,
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
