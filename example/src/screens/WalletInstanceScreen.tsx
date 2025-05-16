import React, { useMemo } from "react";
import {
  createWalletInstanceThunk,
  revokeWalletInstanceThunk,
} from "../thunks/instance";
import { useAppDispatch, useAppSelector } from "../store/utils";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import {
  instanceReset,
  selectHasInstanceKeyTag,
  selectInstanceAsyncStatus,
  selectInstanceKeyTag,
  selectInstanceRevocationAsyncStatus,
} from "../store/reducers/instance";
import {
  selectAttestationAsJwt,
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
  const instanceRevocationState = useAppSelector(
    selectInstanceRevocationAsyncStatus
  );
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  const instanceKeyTag = useAppSelector(selectInstanceKeyTag);
  const attestation = useAppSelector(selectAttestationAsJwt);

  useDebugInfo({
    instanceState,
    instanceKeyTag,
    attestationState,
    attestation,
    instanceRevocationState,
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
                  style: "cancel",
                },
              ]
            );
          } else {
            dispatch(createWalletInstanceThunk());
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
      {
        title: "Revoke current Wallet Instance",
        onPress: () => dispatch(revokeWalletInstanceThunk()),
        isLoading: instanceRevocationState.isLoading,
        hasError: instanceRevocationState.hasError,
        isDone: instanceRevocationState.isDone,
        icon: "trashcan",
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
      instanceRevocationState.isDone,
      instanceRevocationState.isLoading,
      instanceRevocationState.hasError,
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
