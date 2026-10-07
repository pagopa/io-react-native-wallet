import {
  Body,
  IOVisualCostants,
  ListItemNav,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React from "react";
import { Alert, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type EudiCredentialItem = {
  id: string;
  issuer: string;
  name: string;
};

/**
 * EUDI Wallet credentials screen, which lists every obtained credential to check its content.
 */
export const EudiCredentialsScreen = () => {
  // TODO: read the obtained credentials from the store
  const credentials: EudiCredentialItem[] = [];

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={credentials}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Body>No credentials obtained yet</Body>}
        ListFooterComponent={<VSpacer size={32} />}
        renderItem={({ item }) => (
          <ListItemNav
            accessibilityLabel={item.name}
            description={item.issuer}
            onPress={() => Alert.alert("Not implemented yet")}
            value={item.name}
          />
        )}
      />
    </SafeAreaView>
  );
};
