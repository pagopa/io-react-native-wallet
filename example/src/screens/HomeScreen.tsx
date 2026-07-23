import type { ComponentProps } from "react";

import {
  IOVisualCostants,
  ModuleSummary,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { Alert, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectWalletUnitAttestation } from "../store/reducers/attestation";
import { selectCredentials } from "../store/reducers/credential";
import { selectHasInstanceKeyTag } from "../store/reducers/instance";
import { selectPid } from "../store/reducers/pid";
import { selectIoAuthToken } from "../store/reducers/session";
import { useAppSelector } from "../store/utils";

type ModuleSummaryProps = ComponentProps<typeof ModuleSummary>;

/**
 * Home screen component which contains different sections to test the SDK functionalities.
 * This includes interacting with the wallet instance provider, issuing a PID and a credential, get their status attestation and more.
 */
const HomeScreen = () => {
  const navigation = useNavigation();
  const hasIntegrityKeyTag = useAppSelector(selectHasInstanceKeyTag);
  const pid = useAppSelector(selectPid);
  const wua = useAppSelector(selectWalletUnitAttestation);
  const session = useAppSelector(selectIoAuthToken);
  const credentials = useAppSelector(selectCredentials);

  useDebugInfo({
    session,
  });

  const hasSomeCredential = React.useMemo(
    () => Object.values(credentials).filter((_) => !!_).length > 0,
    [credentials],
  );

  const sections: ModuleSummaryProps[] = useMemo(
    () => [
      {
        description: "Register a wallet instance and obtain an attestation",
        icon: "chevronRight",
        label: "Wallet Instance & Attestation",
        onPress: () => navigation.navigate("WalletInstance"),
      },
      {
        description: "Obtain a PID with SPID or CIE",
        icon: "chevronRight",
        label: "PID",
        onPress: () =>
          hasIntegrityKeyTag
            ? navigation.navigate("Pid")
            : Alert.alert("Create a wallet instance first"),
      },
      {
        description: "Obtain a credential with PID authentication",
        icon: "chevronRight",
        label: "Credentials",
        onPress: () =>
          pid && hasIntegrityKeyTag
            ? navigation.navigate("Credentials")
            : Alert.alert("Register a wallet instance and obtain a PID first"),
      },
      {
        description: "Present credentials to a verifier",
        icon: "chevronRight",
        label: "Presentations",
        onPress: () =>
          pid
            ? navigation.navigate("Presentations")
            : Alert.alert("Obtain a PID first"),
      },
      {
        description: "Verify the trust of an entity",
        icon: "chevronRight",
        label: "Trust Federation",
        onPress: () => navigation.navigate("Trust"),
      },
      {
        description:
          "Obtain the status of a credential (Status Assertion/Status List)",
        icon: "chevronRight",
        label: "Credential Status",
        onPress: () =>
          wua || pid
            ? navigation.navigate("CredentialStatus")
            : Alert.alert("Obtain a WUA or a PID first"),
      },
      {
        description: "Obtain the trustmark of a credential",
        icon: "chevronRight",
        label: "Trustmark",
        onPress: () =>
          hasSomeCredential
            ? navigation.navigate("Trustmark")
            : Alert.alert("Obtain a credential first"),
      },
      {
        description: "Obtain a credential offer from QR code",
        icon: "chevronRight",
        label: "Credential Offer",
        onPress: () =>
          pid
            ? navigation.navigate("CredentialOffer")
            : Alert.alert("Obtain a PID first"),
      },
      {
        description: "Fetch the Credentials Catalogue",
        icon: "chevronRight",
        label: "Credentials Catalogue",
        onPress: () => navigation.navigate("CredentialsCatalogue"),
      },
      {
        description: "Change the environment and logout",
        icon: "chevronRight",
        label: "Settings",
        onPress: () => navigation.navigate("Settings"),
      },
    ],
    [hasIntegrityKeyTag, navigation, pid, wua, hasSomeCredential],
  );

  return (
    <SafeAreaView edges={["bottom"]}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={sections}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        ListFooterComponent={<VSpacer size={32} />}
        renderItem={({ item }) => (
          <>
            <ModuleSummary
              description={item.description}
              icon={item.icon}
              label={item.label}
              onPress={item.onPress}
            />
            <VSpacer />
          </>
        )}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
