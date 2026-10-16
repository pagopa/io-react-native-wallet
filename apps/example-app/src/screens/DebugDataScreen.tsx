import {
  BodySmall,
  H6,
  HStack,
  IconButton,
  IOColors,
  SearchInput,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DebugPrettyPrint } from "../components/debug/DebugPrettyPrint";
import { debugDataSelector } from "../store/reducers/debug";
import { useAppSelector } from "../store/utils";
import { clipboardSetStringWithFeedback } from "../utils/clipboard";
import { decodeDebugTokens, filterDebugData } from "../utils/debug";
import { shareJson } from "../utils/share";

type Entries = (readonly [string, unknown])[];

type ToggleChipProps = {
  label: string;
  onPress: (value: boolean) => void;
  value: boolean;
};

const ToggleChip = ({ label, onPress, value }: ToggleChipProps) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
    onPress={() => onPress(!value)}
    style={[styles.chip, value && styles.chipSelected]}
  >
    <BodySmall color={value ? "white" : "grey-700"} weight="Semibold">
      {label}
    </BodySmall>
  </Pressable>
);

/**
 * Native sheet showing the debug data of the previous screen, opened from the header bug button.
 * Tokens and mdocs can be decoded in place, long strings shown in full and the data searched.
 */
export const DebugDataScreen = () => {
  const debugData = useAppSelector(debugDataSelector);
  const navigation = useNavigation();
  const [isDecodingTokens, setIsDecodingTokens] = useState(true);
  const [isShowingFullStrings, setIsShowingFullStrings] = useState(false);
  const [search, setSearch] = useState("");
  const [decoded, setDecoded] = useState<{
    entries: Entries;
    source: typeof debugData;
  }>();

  const rawEntries = useMemo(
    () => Object.entries(debugData).filter(([, value]) => value),
    [debugData],
  );

  // Decoding is asynchronous, so the raw data is shown until it is ready
  useEffect(() => {
    if (!isDecodingTokens) {
      return;
    }
    let isCancelled = false;
    Promise.all(
      rawEntries.map(
        async ([key, value]) => [key, await decodeDebugTokens(value)] as const,
      ),
    ).then((entries) => {
      if (!isCancelled) {
        setDecoded({ entries, source: debugData });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [debugData, isDecodingTokens, rawEntries]);

  const entries =
    isDecodingTokens && decoded?.source === debugData
      ? decoded.entries
      : rawEntries;

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const visibleEntries = useMemo(
    () =>
      isSearching
        ? entries.flatMap(([key, value]) => {
            const filtered = filterDebugData(value, query, key);
            return filtered === undefined ? [] : [[key, filtered] as const];
          })
        : entries,
    [entries, isSearching, query],
  );

  const asJson = () =>
    JSON.stringify(Object.fromEntries(visibleEntries), null, 2);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.header}>
        <H6>Debug data</H6>
        <HStack space={16}>
          <IconButton
            accessibilityLabel="Copy all debug data"
            disabled={visibleEntries.length === 0}
            icon="copy"
            onPress={() => clipboardSetStringWithFeedback(asJson())}
          />
          <IconButton
            accessibilityLabel="Share all debug data"
            disabled={visibleEntries.length === 0}
            icon={Platform.OS === "ios" ? "shareiOs" : "shareAndroid"}
            onPress={() => shareJson("debug_data", asJson())}
          />
          <IconButton
            accessibilityLabel="Close debug data"
            icon="closeMedium"
            onPress={navigation.goBack}
          />
        </HStack>
      </View>
      <View style={styles.padded}>
        <SearchInput
          accessibilityLabel="Search debug data"
          cancelButtonLabel="Cancel"
          clearAccessibilityLabel="Clear search"
          onCancel={() => setSearch("")}
          onChangeText={setSearch}
          placeholder="Search keys and values"
          value={search}
        />
      </View>
      <HStack space={8} style={styles.toolbar}>
        <ToggleChip
          label="Decode tokens"
          onPress={setIsDecodingTokens}
          value={isDecodingTokens}
        />
        <ToggleChip
          label="Full strings"
          onPress={setIsShowingFullStrings}
          value={isShowingFullStrings}
        />
      </HStack>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {visibleEntries.length === 0 ? (
          <BodySmall>
            {isSearching ? "No match." : "No debug data for this screen."}
          </BodySmall>
        ) : (
          visibleEntries.map(([key, value]) => (
            <DebugPrettyPrint
              data={value}
              isExpanded={isSearching || visibleEntries.length === 1}
              isTruncated={!isShowingFullStrings}
              key={`debug_data_${key}_${isSearching}`}
              title={key}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: IOColors["grey-100"],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: IOColors["blueIO-500"],
  },
  container: {
    backgroundColor: IOColors.white,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  // Horizontal padding is on the content, not on the container, so that the scroll indicator stays at the screen edge
  padded: {
    paddingHorizontal: 24,
  },
  scrollContainer: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  toolbar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
