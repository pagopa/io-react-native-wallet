import React from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { selectEuropeanCredentials } from "../store/reducers/credential";
import { useDebugInfo } from "../hooks/useDebugInfo";
import CredentialDetailCard from "../components/CredentialDetailCard";

const ExploreCredentials = () => {
  const credentialsRecord = useSelector(selectEuropeanCredentials);

  useDebugInfo({
    credentialsRecord,
  });

  const data = Object.keys(credentialsRecord)
    .map((key) => ({
      key: key,
      credential: credentialsRecord[key],
    }))
    .filter((item) => item.credential !== undefined);

  const renderItem = ({ item }: { item: { key: string; credential: any } }) => {
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Credentials ({data.length})</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
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
