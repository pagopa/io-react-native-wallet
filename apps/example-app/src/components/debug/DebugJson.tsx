import {
  BodySmall,
  HStack,
  IconButton,
  IOColors,
  IOText,
} from "@pagopa/io-app-design-system";
import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { TruncatableValue } from "../../utils/strings";

import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import { findDebugError } from "../../utils/debug";
import { shareJson } from "../../utils/share";
import { truncateObjectStrings } from "../../utils/strings";

/** Length above which a string without whitespace, such as a token, is shortened */
const MAX_STRING_LENGTH = 80;

/** Length above which a text, such as an error message, is shortened */
const MAX_TEXT_LENGTH = 1000;

/** Width in pixels of one indentation level */
const INDENT_WIDTH = 6;

/**
 * Maximum length of a text chunk. iOS renders nothing for a text taller than its maximum
 * drawable size, as happens with full strings such as raw credentials or base64 pictures.
 */
const MAX_CHUNK_LENGTH = 2000;

/** Matches a line of pretty-printed JSON: optional key, then value or bracket */
const LINE_REGEX = /^(?:("(?:[^"\\]|\\.)*")(: ))?(.*)$/;

/** A chunk of a pretty-printed JSON line, ready to render */
export type JsonLinePart = {
  color?: string;
  /** Indentation level of the line */
  depth: number;
  /** Key and separator of the line, only in its first chunk */
  key: string;
  text: string;
};

const formatSize = (length: number) => {
  if (length < 1024) {
    return `${length} B`;
  }
  return length < 1024 * 1024
    ? `${(length / 1024).toFixed(1)} KB`
    : `${(length / (1024 * 1024)).toFixed(1)} MB`;
};

/** Color of a JSON value by its type, so that types are recognizable at a glance */
const valueColor = (value: string) => {
  if (value.startsWith('"')) {
    return IOColors["success-700"];
  }
  if (/^-?\d/.test(value)) {
    return IOColors["blueIO-500"];
  }
  if (value.startsWith("true") || value.startsWith("false")) {
    return IOColors["error-500"];
  }
  return value.startsWith("null") ? IOColors["grey-450"] : undefined;
};

/**
 * Shows a JSON string value as plain text, with real line breaks and no escaped quotes,
 * as stack traces and messages embedding JSON are unreadable otherwise.
 */
const unescapeString = (value: string) => {
  if (!value.startsWith('"')) {
    return value;
  }
  const comma = value.endsWith(",") ? "," : "";
  try {
    const parsed: unknown = JSON.parse(comma ? value.slice(0, -1) : value);
    return typeof parsed === "string" ? `"${parsed}"${comma}` : value;
  } catch {
    return value;
  }
};

/**
 * Pretty-prints data as JSON lines with values colored by type. Long lines are split in chunks,
 * so that a list renders each chunk as its own row and only the visible ones are mounted.
 * @param data The data to print
 * @param isTruncated Whether long strings are shortened
 */
export const toJsonLines = (
  data: unknown,
  isTruncated: boolean,
): JsonLinePart[] => {
  const json =
    JSON.stringify(
      isTruncated
        ? truncateObjectStrings(
            data as TruncatableValue,
            MAX_STRING_LENGTH,
            MAX_TEXT_LENGTH,
          )
        : data,
      null,
      2,
    ) ?? "";

  return json.split("\n").flatMap((line) => {
    const trimmed = line.trimStart();
    const depth = (line.length - trimmed.length) / 2;
    const [, key = "", separator = "", value = ""] =
      LINE_REGEX.exec(trimmed) ?? [];
    const color = valueColor(value);
    const display = unescapeString(value);
    const parts: JsonLinePart[] = [];
    for (let i = 0; i < Math.max(display.length, 1); i += MAX_CHUNK_LENGTH) {
      parts.push({
        color,
        depth,
        key: i === 0 ? `${key}${separator}` : "",
        text: display.slice(i, i + MAX_CHUNK_LENGTH),
      });
    }
    return parts;
  });
};

/**
 * Renders a chunk of a pretty-printed JSON line. The line is indented with padding,
 * so that a wrapped value stays aligned with its own level.
 */
export const DebugJsonLine = React.memo(({ part }: { part: JsonLinePart }) => (
  <View style={{ paddingLeft: part.depth * INDENT_WIDTH }}>
    <IOText
      color="grey-700"
      font="FiraCode"
      lineHeight={18}
      selectable
      size={12}
      weight="Medium"
    >
      {part.key}
      <Text style={{ color: part.color }}>{part.text}</Text>
    </IOText>
  </View>
));

type HeaderProps = {
  data: unknown;
  expanded: boolean;
  /** Shows or hides the content of the entry, by its title */
  onToggle: (title: string) => void;
  title: string;
};

/**
 * Header of a debug data entry, with its size, the first error it contains, and the actions
 * to copy, share and show its content.
 */
export const DebugJsonHeader = React.memo(
  ({ data, expanded, onToggle, title }: HeaderProps) => {
    const error = useMemo(() => findDebugError(data), [data]);

    const summary = useMemo(() => {
      const size = formatSize(JSON.stringify(data)?.length ?? 0);
      if (typeof data !== "object" || data === null) {
        return size;
      }
      const count = Object.keys(data).length;
      return `${count} ${count === 1 ? "key" : "keys"} · ${size}`;
    }, [data]);

    return (
      <View
        style={[
          styles.header,
          expanded && styles.headerExpanded,
          error !== undefined && styles.headerError,
        ]}
        testID="DebugJsonHeaderTestID"
      >
        <View style={styles.title}>
          <BodySmall color="white" weight="Semibold">
            {title}
          </BodySmall>
          <BodySmall color="grey-300">{summary}</BodySmall>
          {error !== undefined && (
            <BodySmall color="error-400" numberOfLines={1}>
              {`Error: ${error}`}
            </BodySmall>
          )}
        </View>
        <HStack space={16}>
          <IconButton
            accessibilityLabel="copy"
            color="contrast"
            icon={"copy"}
            iconSize={20}
            onPress={() =>
              clipboardSetStringWithFeedback(JSON.stringify(data, null, 2))
            }
          />
          <IconButton
            accessibilityLabel="share"
            color="contrast"
            icon={Platform.OS === "ios" ? "shareiOs" : "shareAndroid"}
            iconSize={20}
            onPress={() => shareJson(title, JSON.stringify(data, null, 2))}
          />
          <IconButton
            accessibilityLabel="show"
            color="contrast"
            icon={expanded ? "eyeHide" : "eyeShow"}
            iconSize={24}
            onPress={() => onToggle(title)}
          />
        </HStack>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: IOColors["grey-850"],
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 12,
  },
  headerError: {
    backgroundColor: IOColors["error-850"],
  },
  // The content rows continue the card below the header
  headerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  title: {
    flex: 1,
  },
});
