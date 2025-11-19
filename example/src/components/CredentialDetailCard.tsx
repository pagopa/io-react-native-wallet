import React from "react";
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

type CredentialAttribute = {
  value: any;
  name: { en: string };
};

type ParsedCredential = Record<string, CredentialAttribute>;

type FormattedDrivingPrivileges = {
  Category: string;
  Issued: string;
  Expires: string;
  Restrictions?: string;
};

const formatDrivingPrivileges = (
  privileges: any
): FormattedDrivingPrivileges => {
  if (typeof privileges !== "object" || privileges === null) {
    return {
      Category: String(privileges),
      Issued: "N/D",
      Expires: "N/D",
    };
  }

  const output: FormattedDrivingPrivileges = {
    Category: privileges.vehicle_category_code || "N/D",
    Issued: privileges.issue_date || "N/D",
    Expires: privileges.expiry_date || "N/D",
  };

  if (
    privileges.codes &&
    Array.isArray(privileges.codes) &&
    privileges.codes.length > 0
  ) {
    output.Restrictions = privileges.codes
      .map(
        (code: any) =>
          `${code.code} (${code.value}${code.sign ? ` - ${code.sign}` : ""})`
      )
      .join(", ");
  }

  return output;
};

const formatCredentialValue = (
  key: string,
  attribute: CredentialAttribute
): any => {
  const { value } = attribute;

  if (key === "org.iso.18013.5.1:driving_privileges") {
    return formatDrivingPrivileges(value);
  }

  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    const isMappedClaim = Object.values(value).some(
      (v) =>
        typeof v === "object" && v !== null && Object.keys(v).includes("value")
    );

    if (isMappedClaim) {
      return value;
    }

    return Object.values(value)
      .filter((v) => v !== null && v !== undefined)
      .join(", ");
  }

  return String(value);
};

interface CredentialDetailCardProps {
  item: { key: string; credential: EuropeanCredentialWithId };
}

const CredentialDetailCard: React.FC<CredentialDetailCardProps> = ({
  item,
}) => {
  const cred = item.credential;
  const parsedCred: ParsedCredential =
    cred.parsedCredential as ParsedCredential;
  const attributes = parsedCred ? Object.entries(parsedCred) : [];

  const dispatch = useDispatch();

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

      <Text style={styles.subtitle}>Credential Data:</Text>

      {attributes.length > 0 ? (
        attributes.map(([key, attribute]) => {
          const formattedValue = formatCredentialValue(key, attribute);

          if (key === "org.iso.18013.5.1:portrait") {
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
