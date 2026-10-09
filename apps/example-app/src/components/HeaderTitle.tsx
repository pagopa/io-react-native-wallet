import { Badge, IOText } from "@pagopa/io-app-design-system";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { selectEnv, selectItwVersion } from "../store/reducers/environment";
import { selectLoginMethod } from "../store/reducers/session";
import { useAppSelector } from "../store/utils";

interface Props {
  children: string;
  tintColor?: string;
}

/**
 * Custom navigation header that shows, under the screen title, the active IT-Wallet version,
 * the selected environment and the IO login status.
 */
export function HeaderTitle({ children }: Props) {
  const itwVersion = useAppSelector(selectItwVersion);
  const env = useAppSelector(selectEnv);
  const loginMethod = useAppSelector(selectLoginMethod);
  return (
    <View style={styles.wrapper}>
      <IOText
        accessibilityRole="header"
        lineHeight={18}
        numberOfLines={1}
        size={15}
        weight="Bold"
      >
        {children}
      </IOText>
      <View style={styles.badges}>
        <Badge text={itwVersion} variant="default" />
        <Badge
          text={env.toUpperCase()}
          variant={env === "prod" ? "error" : "highlight"}
        />
        {loginMethod ? (
          <Badge text={loginMethod.toUpperCase()} variant="success" />
        ) : (
          <Badge outline text="NO LOGIN" variant="default" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: "row",
    gap: 4,
  },
  wrapper: {
    // Native stack centers the title on iOS and left-aligns it on Android
    alignItems: Platform.OS === "ios" ? "center" : "flex-start",
    flexShrink: 1,
    gap: 2,
  },
});
