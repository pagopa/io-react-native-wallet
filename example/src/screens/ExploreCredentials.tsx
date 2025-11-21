import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { selectEuropeanCredentials } from "../store/reducers/credential";
import CredentialDetailCard from "../components/CredentialDetailCard";
import type { EuropeanCredentialWithId } from "../store/types";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDebugInfo } from "../hooks/useDebugInfo";

const ExploreCredentials = () => {
  const { bottom } = useSafeAreaInsets();
  const credentialsRecord = useSelector(selectEuropeanCredentials);

  useDebugInfo({
    credentialsRecord,
  });

  const data = useMemo(() => {
    const allCredentials = Object.values(credentialsRecord)
      .flat()
      .filter((cred) => cred !== undefined);

    return allCredentials.map((cred) => ({
      key: cred.id,
      credential: cred,
    }));
  }, [credentialsRecord]);

  const renderItem = ({
    item,
  }: {
    item: { key: string; credential: EuropeanCredentialWithId };
  }) => {
    return <CredentialDetailCard item={item} />;
  };

  if (data.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No EU credentials available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottom }]}>
      <Text style={styles.header}>Credentials ({data.length})</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
  },
});

export default ExploreCredentials;
