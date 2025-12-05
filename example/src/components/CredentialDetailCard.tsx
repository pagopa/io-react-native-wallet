import React, { useCallback, useEffect } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { addPadding } from "@pagopa/io-react-native-jwt";
import { removeEuropeanCredential } from "../store/reducers/credential";
import { Icon } from "@pagopa/io-app-design-system";
import type { EuropeanCredentialWithId } from "../store/types";
import {
  getListFromStatusListJWT,
  getStatusListFromJWT,
  type StatusListEntry,
} from "@sd-jwt/jwt-status-list";
import { CBOR } from "@pagopa/io-react-native-iso18013";
import {
  type CredentialAttribute,
  formatCredentialValue,
  type ParsedCredential,
} from "./utils/decoder";

interface CredentialDetailCardProps {
  item: { key: string; credential: EuropeanCredentialWithId };
}

const CredentialDetailCard: React.FC<CredentialDetailCardProps> = ({
  item,
}) => {
  const [status, setStatus] = React.useState<number | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const cred = item.credential;
  const parsedCred: ParsedCredential =
    cred.parsedCredential as ParsedCredential;
  const attributes = parsedCred ? Object.entries(parsedCred) : [];

  const dispatch = useDispatch();

  // Function to verify status list of the credential
  const verifyStatusList = useCallback(
    async (credential: EuropeanCredentialWithId) => {
      setStatus(null);
      setStatusError(null);

      try {
        let uri: string | undefined;
        let idx: number | undefined;

        // MDOC
        if (credential.format === "mso_mdoc") {
          const decoded = await CBOR.decode(credential.credential as any);
          const statusListEntry = decoded?.issuerAuth?.payload?.status
            ?.status_list as StatusListEntry;

          if (!statusListEntry) {
            setStatusError("Status list reference not found in credential");
            return;
          }

          uri = statusListEntry.uri;
          idx = statusListEntry.idx;
        } else {
          // SD-JWT
          const statusListEntry = getStatusListFromJWT(credential.credential);

          if (!statusListEntry) {
            setStatusError("Status list reference not found in JWT");
            return;
          }

          uri = statusListEntry.uri;
          idx = statusListEntry.idx;
        }

        if (!uri) {
          setStatusError("Invalid status list reference");
          return;
        }

        const response = await fetch(uri, {
          headers: {
            Accept: "*/*",
          },
        });

        if (!response.ok) {
          setStatusError(
            `Unable to fetch status list (HTTP ${response.status}).`
          );
          return;
        }

        const jwtText = await response.text();
        const statusList = getListFromStatusListJWT(jwtText);

        const statusEntry = statusList.getStatus(idx);
        setStatus(statusEntry);
      } catch (error) {
        console.error("verifyStatusList error:", error);
        setStatusError(error instanceof Error ? error.message : String(error));
      }
    },
    [setStatus, setStatusError]
  );

  // Function to handle deletion of the credential
  const handleDeletion = () => {
    Alert.alert(
      "Delete Credential",
      `Are you sure you want to delete the credential with ID: ${item.key}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch(
              removeEuropeanCredential({
                type: item.credential.credentialType,
                id: item.key,
              })
            );
          },
        },
      ]
    );
  };

  useEffect(() => {
    verifyStatusList(cred);
  }, [cred, verifyStatusList]);

  return (
    <View style={styles.card}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.title}>UUID: {item.key}</Text>
          <Text style={styles.title}>
            Credential ID: {item.credential.credentialType}
          </Text>
        </View>

        <TouchableOpacity onPress={handleDeletion}>
          <Icon size={24} name="trashcan" color={"error-500"} />
        </TouchableOpacity>
      </View>

      <Text style={styles.metadata}>
        <Text style={styles.metadataLabel}>Format:</Text> {cred.format || "N/D"}
      </Text>

      <View style={styles.divider} />
      {status !== null && (
        <Text>
          <Text style={styles.metadataLabel}>Status: </Text>
          {status}
        </Text>
      )}

      {statusError && (
        <Text style={{ color: "red" }}>
          <Text style={styles.metadataLabel}>Status Error: </Text>
          {statusError}
        </Text>
      )}
      <Text style={styles.subtitle}>Credential Data:</Text>

      {attributes.length > 0 ? (
        attributes.map(([key, attribute]) => {
          const formattedValue = formatCredentialValue(key, attribute);
          console.log(key);
          if (
            key === "org.iso.18013.5.1:portrait" ||
            key === "org.iso.18013.5.1:signature_usual_mark" ||
            key === "eu.europa.ec.eudi.pid.1:portrait"
          ) {
            return (
              <View key={key} style={styles.imageClaimRow}>
                <Text style={styles.detailLabel}>
                  {attribute.name?.en || key}:
                </Text>
                <Image
                  style={styles.portraitImage}
                  source={{
                    uri: `data:image/png;base64,${addPadding(attribute.value)}`,
                  }}
                />
              </View>
            );
          }

          const isComplexClaimWithNames =
            typeof formattedValue === "object" &&
            formattedValue !== null &&
            !Array.isArray(formattedValue) &&
            Object.values(formattedValue).some(
              (v) =>
                typeof v === "object" &&
                v !== null &&
                Object.keys(v).includes("value")
            );

          if (isComplexClaimWithNames) {
            return (
              <View key={key} style={styles.claimContainer}>
                <Text style={styles.detailLabel}>
                  {attribute.name?.en || key}:
                </Text>
                <View style={styles.nestedContainer}>
                  {Object.entries(formattedValue).map(
                    ([subKey, subAttribute]) => {
                      const subAttributeObj =
                        subAttribute as CredentialAttribute;
                      return (
                        <View key={subKey} style={styles.claimRow}>
                          <Text style={styles.nestedLabel}>
                            {subAttributeObj.name?.en || subKey}:
                          </Text>
                          <Text style={styles.detailValue}>
                            {String(subAttributeObj.value)}
                          </Text>
                        </View>
                      );
                    }
                  )}
                </View>
              </View>
            );
          }

          if (
            key === "org.iso.18013.5.1:driving_privileges" &&
            typeof formattedValue === "object" &&
            formattedValue !== null
          ) {
            return (
              <View key={key} style={styles.claimContainer}>
                <Text style={styles.detailLabel}>
                  {attribute.name?.en || key}:
                </Text>
                <View style={styles.nestedContainer}>
                  {Object.entries(formattedValue).map(([subKey, subValue]) => (
                    <View key={subKey} style={styles.claimRow}>
                      <Text style={styles.nestedLabel}>{subKey}:</Text>
                      <Text style={styles.detailValue}>
                        {subValue as string}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }

          return (
            <View key={key} style={styles.claimRow}>
              <Text style={styles.detailLabel}>
                {attribute.name?.en || key}:
              </Text>
              <Text style={styles.detailValue}>{formattedValue}</Text>
            </View>
          );
        })
      ) : (
        <Text style={styles.detail}>No parsed attributes available.</Text>
      )}
    </View>
  );
};

export default CredentialDetailCard;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#003366",
    flexShrink: 1,
    maxWidth: 250,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 5,
    color: "#333",
  },
  claimContainer: {
    marginBottom: 8,
  },
  claimRow: {
    flexDirection: "row",
    marginBottom: 4,
    flexWrap: "wrap",
    paddingLeft: 0,
  },
  nestedContainer: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#eee",
    marginTop: 4,
  },
  imageClaimRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "center",
  },
  detailLabel: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#555",
    marginRight: 8,
  },
  nestedLabel: {
    fontWeight: "600",
    fontSize: 14,
    color: "#555",
    marginRight: 5,
    minWidth: 70,
  },
  detailValue: {
    fontSize: 14,
    color: "#555",
    flexShrink: 1,
  },
  portraitImage: {
    width: 80,
    height: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    resizeMode: "contain",
  },
  metadata: {
    marginTop: 5,
    fontSize: 14,
    color: "#888",
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  detail: {
    fontSize: 14,
    color: "#555",
    marginBottom: 3,
  },
});
