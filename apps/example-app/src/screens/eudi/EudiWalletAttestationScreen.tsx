import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../../components/TestScenario";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  selectEudiWalletAttestation,
  selectEudiWalletAttestationStatus,
  selectEudiWalletInstance,
  selectEudiWalletInstanceStatus,
} from "../../store/reducers/eudi/walletAttestation";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  createEudiWalletInstanceThunk,
  getEudiWalletAttestationThunk,
} from "../../thunks/eudi/walletAttestation";
import { EUDI_WALLET_PROVIDER_BASE_URL } from "../../utils/eudi";

/**
 * Screen to create an EUDI Wallet Instance and obtain its Wallet Attestation
 * from the test EUDI Wallet Provider, separate from the IT-Wallet ones.
 */
export const EudiWalletAttestationScreen = () => {
  const dispatch = useAppDispatch();
  const instance = useAppSelector(selectEudiWalletInstance);
  const instanceStatus = useAppSelector(selectEudiWalletInstanceStatus);
  const walletAttestation = useAppSelector(selectEudiWalletAttestation);
  const walletAttestationStatus = useAppSelector(
    selectEudiWalletAttestationStatus,
  );

  useDebugInfo({
    instance,
    instanceStatus,
    walletAttestation,
    walletAttestationStatus,
    walletProvider: EUDI_WALLET_PROVIDER_BASE_URL,
  });

  const scenarios: TestScenarioProp[] = [
    {
      ...instanceStatus,
      icon: "device",
      isPresent: !!instance,
      onPress: () => dispatch(createEudiWalletInstanceThunk()),
      title: "Create Wallet Instance",
    },
    {
      ...walletAttestationStatus,
      icon: "bonus",
      isPresent: !!walletAttestation,
      onPress: () => dispatch(getEudiWalletAttestationThunk()),
      title: "Get Wallet Attestation",
    },
  ];

  return (
    <FlatList
      contentContainerStyle={{
        margin: IOVisualCostants.appMarginDefault,
      }}
      data={scenarios}
      keyExtractor={(item) => item.title}
      renderItem={({ item }) => (
        <>
          <TestScenario {...item} />
          <VSpacer />
        </>
      )}
    />
  );
};
