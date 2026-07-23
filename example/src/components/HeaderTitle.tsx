import { Badge, IOText } from "@pagopa/io-app-design-system";
import React from "react";
import { StyleSheet, View } from "react-native";

import { selectItwVersion } from "../store/reducers/environment";
import { useAppSelector } from "../store/utils";

interface Props {
  children: string;
  tintColor?: string;
}

/**
 * Custom navigation header that appends the active IT-Wallet version to the screen title.
 */
export function HeaderTitle({ children }: Props) {
  const itwVersion = useAppSelector(selectItwVersion);
  return (
    <View style={styles.wrapper}>
      <IOText
        accessibilityRole="header"
        numberOfLines={1}
        size={20}
        weight="Bold"
      >
        {children}
      </IOText>
      <Badge text={itwVersion} variant="default" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
});
