import {
  Body,
  H6,
  HStack,
  IconButton,
  IOColors,
  ListItemSwitch,
} from "@pagopa/io-app-design-system";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  debugDataSelector,
  debugVisibilitySelector,
  setDebugVisibility,
} from "../../store/reducers/debug";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import { decodeDebugTokens } from "../../utils/debug";
import { DebugPrettyPrint } from "./DebugPrettyPrint";

/**
 * Panel showing the debug data of the current screen, opened from the header bug button.
 * Tokens can be decoded in place and long strings shown in full.
 */
export const DebugDataOverlay = () => {
  const debugData = useAppSelector(debugDataSelector);
  const isDebugDataVisibile = useAppSelector(debugVisibilitySelector);
  const dispatch = useAppDispatch();
  const [isDecodingTokens, setIsDecodingTokens] = useState(true);
  const [isShowingFullStrings, setIsShowingFullStrings] = useState(false);

  const entries = useMemo(
    () =>
      Object.entries(debugData)
        .filter(([, value]) => value)
        .map(
          ([key, value]) =>
            [key, isDecodingTokens ? decodeDebugTokens(value) : value] as const,
        ),
    [debugData, isDecodingTokens],
  );

  if (!isDebugDataVisibile) {
    return null;
  }

  const close = () => dispatch(setDebugVisibility(false));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Close debug data"
        accessibilityRole="button"
        onPress={close}
        style={styles.backdrop}
      />
      <SafeAreaView edges={["bottom"]} style={styles.panel}>
        <View style={styles.header}>
          <H6>Debug data</H6>
          <HStack space={16}>
            <IconButton
              accessibilityLabel="Copy all debug data"
              disabled={entries.length === 0}
              icon="copy"
              onPress={() =>
                clipboardSetStringWithFeedback(
                  JSON.stringify(Object.fromEntries(entries), null, 2),
                )
              }
            />
            <IconButton
              accessibilityLabel="Close debug data"
              icon="closeMedium"
              onPress={close}
            />
          </HStack>
        </View>
        <ListItemSwitch
          description="Show the header, payload and disclosures of JWTs and SD-JWTs"
          label="Decode tokens"
          onSwitchValueChange={setIsDecodingTokens}
          value={isDecodingTokens}
        />
        <ListItemSwitch
          label="Show full strings"
          onSwitchValueChange={setIsShowingFullStrings}
          value={isShowingFullStrings}
        />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {entries.length === 0 ? (
            <Body>No debug data for this screen.</Body>
          ) : (
            entries.map(([key, value]) => (
              <DebugPrettyPrint
                data={value}
                expandable={true}
                isExpanded={entries.length === 1}
                isTruncated={!isShowingFullStrings}
                key={`debug_data_${key}`}
                title={key}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000000B0",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  // Positioned explicitly, as the overlay is rendered above the navigator in the tree
  container: {
    bottom: 0,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 999,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  panel: {
    backgroundColor: IOColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingHorizontal: 24,
  },
  scrollContainer: {
    paddingBottom: 24,
    paddingTop: 8,
  },
});
