/* eslint-disable react-native/no-inline-styles */
import {
  IOVisualCostants,
  ModuleSummary,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { type ComponentProps, useMemo } from "react";
import { Alert, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectCredentials } from "../store/reducers/credential";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import { selectPidSdJwt } from "../store/reducers/pid";
import { selectIoAuthToken } from "../store/reducers/sesssion";
import { useAppSelector } from "../store/utils";
import { selectEuropeanCredentials } from "../store/reducers/credential";

type ModuleSummaryProps = ComponentProps<typeof ModuleSummary>;

/**
 * Home screen component which contains different sections to test the SDK functionalities.
 * This includes interacting with the wallet instance provider, issuing a PID and a credential, get their status attestation and more.
 */
const HomeScreen = () => {
  const { bottom } = useSafeAreaInsets();
  const navigation = useNavigation();
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);
  const pid = useAppSelector(selectPidSdJwt);
  const session = useAppSelector(selectIoAuthToken);
  const credentials = useAppSelector(selectCredentials);
  const europeanCredentials = useAppSelector(selectEuropeanCredentials);

  useDebugInfo({
    session,
  });

  const hasSomeCredential = React.useMemo(
    () => Object.values(credentials).filter((_) => !!_).length > 0,
    [credentials]
  );

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
        label: "EU Credentials",
        description: "Explore obtained European credentials",
        icon: "chevronRight",
        onPress: () => navigation.navigate("ExploreCredentials"),
      },
      {
        label: "Presentations",
        description: "Present credentials to a verifier",
        icon: "chevronRight",
        onPress: () =>
          europeanCredentials.length > 0
            ? navigation.navigate("PresentationOptions")
            : Alert.alert("Obtain EU credentials first"),
      },
      {
        label: "Trust Federation",
        description: "Verify the trust of an entity",
        icon: "chevronRight",
        onPress: () => navigation.navigate("Trust"),
      },
      {
        label: "Status Assertion",
        description: "Obtain the status assertion of a credential",
        icon: "chevronRight",
        onPress: () =>
          pid
            ? navigation.navigate("StatusAssertion")
            : Alert.alert("Obtain a PID first"),
      },
      {
        label: "Trustmark",
        description: "Obtain the trustmark of a credential",
        icon: "chevronRight",
        onPress: () =>
          hasSomeCredential
            ? navigation.navigate("Trustmark")
            : Alert.alert("Obtain a credential first"),
      },
      {
        label: "Credential Offer",
        description: "Obtain a credential offer from QR code",
        icon: "chevronRight",
        onPress: () => navigation.navigate("CredentialOffer"),
      },
      {
        label: "Settings",
        description: "Change the environment and logout",
        icon: "chevronRight",
        onPress: () => navigation.navigate("Settings"),
      },
    ],
    [
      navigation,
      hasIntegrityKeyTag,
      pid,
      hasSomeCredential,
      europeanCredentials,
    ]
  );

  return (
    <View style={{ flex: 1, marginBottom: bottom }}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={sections}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        ListFooterComponent={<VSpacer size={32} />}
        ItemSeparatorComponent={VSpacer}
        renderItem={({ item }) => (
          <ModuleSummary
            label={item.label}
            description={item.description}
            icon={item.icon}
            onPress={item.onPress}
          />
        )}
      />
    </View>
  );
};

export default HomeScreen;
