import {
  BodySmall,
  H6,
  HStack,
  IconButton,
  IOColors,
  SearchInput,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FlatList, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DebugJsonHeader,
  DebugJsonLine,
  type JsonLinePart,
  toJsonLines,
} from "../components/debug/DebugJson";
import { debugDataSelector } from "../store/reducers/debug";
import { useAppSelector } from "../store/utils";
import { clipboardSetStringWithFeedback } from "../utils/clipboard";
import { decodeDebugTokens, filterDebugData } from "../utils/debug";
import { shareJson } from "../utils/share";

/** Row of the debug data list: the header of an entry, or a chunk of its JSON content */
type DebugRow =
  | {
      data: unknown;
      expanded: boolean;
      id: string;
      title: string;
      type: "header";
    }
  | {
      id: string;
      isFirst: boolean;
      isLast: boolean;
      part: JsonLinePart;
      type: "line";
    };

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
 * Modal showing the debug data of the previous screen, opened from the header bug button.
 * Tokens and mdocs can be decoded in place, long strings shown in full and the data searched.
 * The JSON lines are rows of a virtualized list, so that large data renders only the visible lines.
 */
export const DebugDataScreen = () => {
  const debugData = useAppSelector(debugDataSelector);
  const navigation = useNavigation();
  const [isDecodingTokens, setIsDecodingTokens] = useState(true);
  const [isShowingFullStrings, setIsShowingFullStrings] = useState(false);
  const [search, setSearch] = useState("");
  /**
   * Entries shown or hidden by the user, by search mode and key, otherwise expanded by default.
   * Search results have their own choices, as they show other parts of the data.
   */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
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

  // Filtering large data is slow, so the search input stays responsive while typing
  const query = useDeferredValue(search).trim().toLowerCase();
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

  const isExpandedByDefault = isSearching || visibleEntries.length === 1;
  const toggleKey = useCallback(
    (key: string) => `${isSearching}:${key}`,
    [isSearching],
  );

  const onToggle = useCallback(
    (key: string) =>
      setToggled((current) => ({
        ...current,
        [toggleKey(key)]: !(current[toggleKey(key)] ?? isExpandedByDefault),
      })),
    [isExpandedByDefault, toggleKey],
  );

  const rows = useMemo(
    () =>
      visibleEntries.flatMap(([key, value]): DebugRow[] => {
        const expanded = toggled[toggleKey(key)] ?? isExpandedByDefault;
        const header: DebugRow = {
          data: value,
          expanded,
          id: key,
          title: key,
          type: "header",
        };
        if (!expanded) {
          return [header];
        }
        const parts = toJsonLines(value, !isShowingFullStrings);
        return [
          header,
          ...parts.map(
            (part, index): DebugRow => ({
              id: `${key}:${index}`,
              isFirst: index === 0,
              isLast: index === parts.length - 1,
              part,
              type: "line",
            }),
          ),
        ];
      }),
    [
      isExpandedByDefault,
      isShowingFullStrings,
      toggleKey,
      toggled,
      visibleEntries,
    ],
  );

  const asJson = () =>
    JSON.stringify(Object.fromEntries(visibleEntries), null, 2);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
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
      <FlatList
        contentContainerStyle={styles.scrollContainer}
        data={rows}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(row) => row.id}
        ListEmptyComponent={
          <BodySmall>
            {isSearching ? "No match." : "No debug data for this screen."}
          </BodySmall>
        }
        maxToRenderPerBatch={50}
        removeClippedSubviews={Platform.OS === "android"}
        renderItem={({ item }) =>
          item.type === "header" ? (
            <DebugJsonHeader
              data={item.data}
              expanded={item.expanded}
              onToggle={onToggle}
              title={item.title}
            />
          ) : (
            <View
              style={[
                styles.line,
                item.isFirst && styles.firstLine,
                item.isLast && styles.lastLine,
              ]}
            >
              <DebugJsonLine part={item.part} />
            </View>
          )
        }
      />
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
  firstLine: {
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  lastLine: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingBottom: 8,
  },
  line: {
    backgroundColor: IOColors["grey-50"],
    paddingHorizontal: 8,
  },
  // Horizontal padding is on the content, not on the container, so that the scroll indicator stays at the screen edge
  padded: {
    paddingHorizontal: 24,
  },
  scrollContainer: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  toolbar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
