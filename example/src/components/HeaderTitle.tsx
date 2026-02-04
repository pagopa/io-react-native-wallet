import { Badge, IOText } from "@pagopa/io-app-design-system";
import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppSelector } from "../store/utils";
import { selectItwVersion } from "../store/reducers/environment";

type Props = {
  children: string;
  tintColor?: string;
};

/**
 * Custom navigation header that appends the selected IT-Wallet version to the screen title.
 */
export function HeaderTitle({ children }: Props) {
  const itwVersion = useAppSelector(selectItwVersion);
  console.log(itwVersion);
  return (
    <View style={styles.wrapper}>
      <IOText
        weight="Bold"
        size={20}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {children}
      </IOText>
      <Badge variant="default" text={itwVersion} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
