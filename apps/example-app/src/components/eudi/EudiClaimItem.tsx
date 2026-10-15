import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import {
  BodySmall,
  Divider,
  IOColors,
  ListItemInfo,
} from "@pagopa/io-app-design-system";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import {
  formatClaimValue,
  getNestedClaims,
  toImageUri,
} from "../../utils/eudiClaims";

type Props = {
  label: string;
  /** The display names by claim path, for the nested claims */
  labels: Map<string, string>;
  path: Eudi.CredentialIssuance.ClaimPath;
  value: unknown;
};

/**
 * Row of a claim: an image for pictures, nested rows under a title for claims made of other claims,
 * otherwise the formatted value, copied on long press.
 */
export const EudiClaimItem = ({ label, labels, path, value }: Props) => {
  const imageUri = toImageUri(value);
  if (imageUri) {
    return (
      <ListItemInfo
        label={label}
        value={
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={label}
            resizeMode="contain"
            source={{ uri: imageUri }}
            style={styles.claimImage}
          />
        }
      />
    );
  }

  const children = getNestedClaims(label, value, path, labels);
  if (children.length > 0) {
    return (
      <View style={styles.nestedClaim}>
        <BodySmall color="grey-700" weight="Semibold">
          {label}
        </BodySmall>
        <View style={styles.nestedClaimItems}>
          {children.map((child, i) => (
            <React.Fragment key={`${child.label}-${i}`}>
              {i > 0 && <Divider />}
              <EudiClaimItem {...child} labels={labels} />
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  const text = formatClaimValue(value);
  const copy = () => clipboardSetStringWithFeedback(text);
  return (
    <ListItemInfo
      accessibilityActions={[{ label: "Copy", name: "longpress" }]}
      label={label}
      onAccessibilityAction={copy}
      onLongPress={copy}
      value={text}
    />
  );
};

const styles = StyleSheet.create({
  claimImage: {
    alignSelf: "flex-start",
    aspectRatio: 3,
    height: 64,
    marginTop: 4,
  },
  nestedClaim: {
    paddingTop: 12,
  },
  nestedClaimItems: {
    borderColor: IOColors["grey-100"],
    borderLeftWidth: 2,
    marginTop: 4,
    paddingLeft: 12,
  },
});
