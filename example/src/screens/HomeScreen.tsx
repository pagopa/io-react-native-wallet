/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react";

import { Alert, FlatList, SafeAreaView, View } from "react-native";
import { selectIoAuthToken, sessionReset } from "../store/reducers/sesssion";
import { useAppDispatch, useAppSelector } from "../store/utils";
import {
  ButtonSolid,
  IOVisualCostants,
  ModuleSummary,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import type { ComponentProps } from "react";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import { selectCredential } from "../store/reducers/credential";
import { useDebugInfo } from "../hooks/useDebugInfo";

type ModuleSummaryProps = ComponentProps<typeof ModuleSummary>;

/**
 * Home screen component which contains different sections to test the SDK functionalities.
 * This includes interacting with the wallet instance provider, issuing a PID and a credential, get their status attestation and more.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);
  const pid = useAppSelector(selectCredential("PersonIdentificationData"));
  const session = useAppSelector(selectIoAuthToken);
  const mdl = useAppSelector(selectCredential("MDL"));

  useDebugInfo({
    session,
  });

  const sections: Array<ModuleSummaryProps> = useMemo(
    () => [
      {
        label: "Wallet Instance & Attestation",
        description: "Register a wallet instance and obtain an attestation",
        icon: "chevronRight",
        onPress: () => navigation.navigate("WalletInstance"),
      },
      {
        label: "PID",
        description: "Obtain a PID with SPID or CIE",
        icon: "chevronRight",
        onPress: () =>
          hasIntegrityKeyTag
            ? navigation.navigate("Pid")
            : Alert.alert("Create a wallet instance first"),
      },
      {
        label: "Credentials",
        description: "Obtain a credential with PID authentication",
        icon: "chevronRight",
        onPress: () =>
          pid && hasIntegrityKeyTag
            ? navigation.navigate("Credentials")
            : Alert.alert("Register a wallet instance and obtain a PID first"),
      },
      {
        label: "Status Attestation",
        description: "Obtain the status attestation of a credential",
        icon: "chevronRight",
        onPress: () =>
          mdl
            ? navigation.navigate("StatusAttestation")
            : Alert.alert("Obtain a MDL first"),
      },
    ],
    [hasIntegrityKeyTag, mdl, navigation, pid]
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={sections}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        renderItem={({ item }) => (
          <>
            <ModuleSummary
              label={item.label}
              description={item.description}
              icon={item.icon}
              onPress={item.onPress}
            />
            <VSpacer />
          </>
        )}
      />
      <View
        style={{
          justifyContent: "flex-end",
          marginHorizontal: IOVisualCostants.appMarginDefault,
        }}
      >
        <ButtonSolid
          fullWidth
          icon="logout"
          color="danger"
          label="Logout from IO backend"
          onPress={() => dispatch(sessionReset())}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
