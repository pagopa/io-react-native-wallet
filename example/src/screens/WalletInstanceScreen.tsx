import React, { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import compact from "lodash/compact";
import { IoWallet } from "@pagopa/io-react-native-wallet";
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
  selectWalletInstanceAttestationAsJwt,
  selectWalletInstanceAttestationAsSdJwt,
  selectWalletInstanceAttestationAsyncStatus,
  selectWalletUnitAttestation,
  selectWalletUnitAttestationAsyncState,
} from "../store/reducers/attestation";
import {
  getWalletInstanceAttestationThunk,
  getWalletUnitAttestationThunk,
} from "../thunks/attestation";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { Alert, FlatList } from "react-native";
import { selectItwVersion } from "../store/reducers/environment";

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
    selectInstanceRevocationAsyncStatus
  );
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);

  const instanceKeyTag = useAppSelector(selectInstanceKeyTag);
  const wiaJwt = useAppSelector(selectWalletInstanceAttestationAsJwt);
  const wiaSdJwt = useAppSelector(selectWalletInstanceAttestationAsSdJwt);
  const wuaJwt = useAppSelector(selectWalletUnitAttestation);
  const itwVersion = useAppSelector(selectItwVersion);

  const ioWallet = useMemo(
    () => new IoWallet({ version: itwVersion }),
    [itwVersion]
  );

  const isWuaSupported = ioWallet.WalletUnitAttestation.isSupported;

  useDebugInfo({
    instanceState,
    instanceKeyTag,
    wiaState,
    wiaJwt,
    wiaSdJwt,
    ...(isWuaSupported && { wuaState, wuaJwt }),
    instanceRevocationState,
  });

  const scenarios: Array<TestScenarioProp> = compact<TestScenarioProp>([
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
      title: "Get Wallet Instance Attestation",
      onPress: () => dispatch(getWalletInstanceAttestationThunk()),
      isLoading: wiaState.isLoading,
      hasError: wiaState.hasError,
      isDone: wiaState.isDone,
      icon: "bonus",
      isPresent: !!wiaJwt,
    },
    isWuaSupported && {
      title: "Get Wallet Unit Attestation (2 keys)",
      onPress: () =>
        dispatch(
          getWalletUnitAttestationThunk({
            keyTags: Array.from({ length: 2 }).map(() => uuidv4().toString()),
          })
        ),
      isLoading: wuaState.isLoading,
      hasError: wuaState.hasError,
      isDone: wuaState.isDone,
      icon: "bonus",
      isPresent: !!wuaJwt,
    },
    {
      title: "Revoke current Wallet Instance",
      onPress: () => dispatch(revokeWalletInstanceThunk()),
      isLoading: instanceRevocationState.isLoading,
      hasError: instanceRevocationState.hasError,
      isDone: instanceRevocationState.isDone,
      icon: "trashcan",
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
