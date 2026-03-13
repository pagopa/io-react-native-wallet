import React, { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
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
  selectAttestationAsSdJwt,
  selectAttestationAsyncStatus,
} from "../store/reducers/attestation";
import {
  getAttestationThunk,
  getWalletUnitAttestationThunk,
} from "../thunks/attestation";
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
  const attestationJwt = useAppSelector(selectAttestationAsJwt);
  const attestationSdJwt = useAppSelector(selectAttestationAsSdJwt);

  useDebugInfo({
    instanceState,
    instanceKeyTag,
    attestationState,
    attestationJwt,
    attestationSdJwt,
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
        isPresent: !!attestationJwt,
      },
      {
        title: "Get Wallet Unit Attestation | 2 keys",
        onPress: () =>
          dispatch(
            getWalletUnitAttestationThunk({
              keyTags: Array.from({ length: 2 }).map(() => uuidv4().toString()),
            })
          ),
        isLoading: attestationState.isLoading,
        hasError: attestationState.hasError,
        isDone: attestationState.isDone,
        icon: "bonus",
        isPresent: !!attestationJwt,
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
      attestationJwt,
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
