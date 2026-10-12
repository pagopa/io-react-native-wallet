import { IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React from "react";
import { FlatList } from "react-native";

import TestScenario, {
  type TestScenarioProp,
} from "../../components/TestScenario";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  selectEudiKeyAttestation,
  selectEudiKeyAttestationStatus,
  selectEudiWalletAttestation,
  selectEudiWalletAttestationStatus,
  selectEudiWalletInstance,
  selectEudiWalletInstanceStatus,
} from "../../store/reducers/eudi/walletAttestation";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  createEudiWalletInstanceThunk,
  getEudiKeyAttestationThunk,
  getEudiWalletAttestationThunk,
} from "../../thunks/eudi/walletAttestation";
import {
  EUDI_KA_KEYTAG,
  EUDI_WALLET_PROVIDER_BASE_URL,
} from "../../utils/eudi";

/**
 * Screen to create an EUDI Wallet Instance and obtain its Wallet Attestation and a Key Attestation
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
  const keyAttestation = useAppSelector(selectEudiKeyAttestation);
  const keyAttestationStatus = useAppSelector(selectEudiKeyAttestationStatus);

  useDebugInfo({
    instance,
    instanceStatus,
    keyAttestation,
    keyAttestationStatus,
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
    {
      ...keyAttestationStatus,
      icon: "key",
      isPresent: !!keyAttestation,
      onPress: () => dispatch(getEudiKeyAttestationThunk(EUDI_KA_KEYTAG)),
      title: "Get Key Attestation",
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
