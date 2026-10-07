import type { ComponentProps } from "react";

import {
  Body,
  IOVisualCostants,
  ModuleSummary,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ModuleSummaryProps = ComponentProps<typeof ModuleSummary>;

/**
 * EUDI Wallet screen, separate from the IT-Wallet flows.
 * It contains the sections used to test interoperability with the wallets, issuers and verifiers of other member states.
 */
export const EudiWalletScreen = () => {
  const navigation = useNavigation();

  const sections: ModuleSummaryProps[] = useMemo(
    () => [
      {
        description: "Obtain a credential from a credential offer",
        icon: "chevronRight",
        label: "Credential Request",
        onPress: () => navigation.navigate("EudiCredentialRequest"),
      },
      {
        description: "Check the obtained credentials",
        icon: "chevronRight",
        label: "Credentials",
        onPress: () => navigation.navigate("EudiCredentials"),
      },
      {
        description: "Present a credential to a verifier",
        icon: "chevronRight",
        label: "Credential Presentation",
        onPress: () => navigation.navigate("EudiPresentation"),
      },
    ],
    [navigation],
  );

  return (
    <SafeAreaView edges={["bottom"]}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={sections}
        keyExtractor={(item, index) => `${item.label}-${index}`}
        ListEmptyComponent={
          <Body>No interoperability tests available yet</Body>
        }
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
