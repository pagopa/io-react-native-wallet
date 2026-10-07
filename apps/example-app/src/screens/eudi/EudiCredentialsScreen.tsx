import { Body, IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import { selectEudiCredentials } from "../../store/reducers/eudi/credentials";
import { useAppSelector } from "../../store/utils";

/**
 * EUDI Wallet credentials screen, which lists every obtained credential to check its content.
 */
export const EudiCredentialsScreen = () => {
  const navigation = useNavigation();
  const credentials = useAppSelector(selectEudiCredentials);

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={credentials}
        ItemSeparatorComponent={VSpacer}
        keyExtractor={(item) => item.keyTag}
        ListEmptyComponent={<Body>No credentials obtained yet</Body>}
        ListFooterComponent={<VSpacer size={32} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={
              item.display?.name ?? item.credentialConfigurationId
            }
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("EudiCredentialDetail", {
                keyTag: item.keyTag,
              })
            }
          >
            <EudiCredentialCard credential={item} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
};
