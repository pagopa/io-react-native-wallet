import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { IoWallet } from "@pagopa/io-react-native-wallet";
import compact from "lodash/compact";
import React, { useMemo } from "react";
import { Alert, FlatList } from "react-native";
import { v4 as uuidv4 } from "uuid";

import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  selectWalletInstanceAttestationAsJwt,
  selectWalletInstanceAttestationAsSdJwt,
  selectWalletInstanceAttestationAsyncStatus,
  selectWalletUnitAttestation,
  selectWalletUnitAttestationAsyncState,
} from "../store/reducers/attestation";
import { selectItwVersion } from "../store/reducers/environment";
import {
  instanceReset,
  selectHasInstanceKeyTag,
  selectInstanceAsyncStatus,
  selectInstanceKeyTag,
  selectInstanceRevocationAsyncStatus,
} from "../store/reducers/instance";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  getWalletInstanceAttestationThunk,
  getWalletUnitAttestationThunk,
} from "../thunks/attestation";
import {
  createWalletInstanceThunk,
  revokeWalletInstanceThunk,
} from "../thunks/instance";

/**
 * Component (screen in a future PR) to test the wallet instance functionalities.
 * This includes creating a wallet instance and getting an attestation.
 */
export const WalletInstanceScreen = () => {
  const dispatch = useAppDispatch();
  const instanceState = useAppSelector(selectInstanceAsyncStatus);
  const wiaState = useAppSelector(selectWalletInstanceAttestationAsyncStatus);
  const wuaState = useAppSelector(selectWalletUnitAttestationAsyncState);
  const instanceRevocationState = useAppSelector(
    selectInstanceRevocationAsyncStatus,
  );
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  const instanceKeyTag = useAppSelector(selectInstanceKeyTag);
  const wiaJwt = useAppSelector(selectWalletInstanceAttestationAsJwt);
  const wiaSdJwt = useAppSelector(selectWalletInstanceAttestationAsSdJwt);
  const wuaJwt = useAppSelector(selectWalletUnitAttestation);
  const itwVersion = useAppSelector(selectItwVersion);

  const ioWallet = useMemo(
    () => new IoWallet({ version: itwVersion }),
    [itwVersion],
  );

  const isWuaSupported = ioWallet.WalletUnitAttestation.isSupported;

  useDebugInfo({
    instanceKeyTag,
    instanceState,
    wiaJwt,
    wiaSdJwt,
    wiaState,
    ...(isWuaSupported && { wuaJwt, wuaState }),
    instanceRevocationState,
  });

  const scenarios: TestScenarioProp[] = compact<TestScenarioProp>([
    {
      hasError: instanceState.hasError,
      icon: "device",
      isDone: instanceState.isDone,
      isLoading: instanceState.isLoading,
      isPresent: hasIntegrityKeyTag,
      onPress: () => {
        if (hasIntegrityKeyTag) {
          Alert.alert(
            "Wallet instance already exits",
            "This will reset the whole app state except the session",
            [
              {
                onPress: () => {
                  dispatch(instanceReset());
                  dispatch(createWalletInstanceThunk());
                },
                style: "destructive",
                text: "Ok",
              },
              {
                style: "cancel",
                text: "Cancel",
              },
            ],
          );
        } else {
          dispatch(createWalletInstanceThunk());
        }
      },
      title: "Create Wallet Instance",
    },
    {
      hasError: wiaState.hasError,
      icon: "bonus",
      isDone: wiaState.isDone,
      isLoading: wiaState.isLoading,
      isPresent: !!wiaJwt,
      onPress: () => dispatch(getWalletInstanceAttestationThunk()),
      title: "Get Wallet Instance Attestation",
    },
    isWuaSupported && {
      hasError: wuaState.hasError,
      icon: "bonus",
      isDone: wuaState.isDone,
      isLoading: wuaState.isLoading,
      isPresent: !!wuaJwt,
      onPress: () =>
        dispatch(
          getWalletUnitAttestationThunk({
            keyTags: Array.from({ length: 2 }).map(() => uuidv4().toString()),
          }),
        ),
      title: "Get Wallet Unit Attestation (2 keys)",
    },
    {
      hasError: instanceRevocationState.hasError,
      icon: "trashcan",
      isDone: instanceRevocationState.isDone,
      isLoading: instanceRevocationState.isLoading,
      onPress: () => dispatch(revokeWalletInstanceThunk()),
      title: "Revoke current Wallet Instance",
    },
  ]);

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
            hasError={item.hasError}
            icon={item.icon}
            isDone={item.isDone}
            isLoading={item.isLoading}
            isPresent={item.isPresent}
            onPress={item.onPress}
            title={item.title}
          />
          <VSpacer />
        </>
      )}
    />
  );
};
