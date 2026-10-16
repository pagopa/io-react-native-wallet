import {
  BodySmall,
  HStack,
  IconButton,
  IOColors,
  IOText,
} from "@pagopa/io-app-design-system";
import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { TruncatableValue } from "../../utils/strings";

import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import { shareJson } from "../../utils/share";
import { truncateObjectStrings } from "../../utils/strings";

type Props = {
  data: unknown;
  /** Whether the entry is initially expanded, `false` by default */
  isExpanded?: boolean;
  /** Whether long strings are shortened, `true` by default */
  isTruncated?: boolean;
  title: string;
};

/** Length above which a string is shortened, when truncation is enabled */
const MAX_STRING_LENGTH = 80;

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

/** Width in pixels of one indentation level */
const INDENT_WIDTH = 6;

/**
 * Maximum length of a text chunk. iOS renders nothing for a text taller than its maximum
 * drawable size, as happens with full strings such as raw credentials or base64 pictures.
 */
const MAX_CHUNK_LENGTH = 2000;

/** Matches a line of pretty-printed JSON: optional key, then value or bracket */
const LINE_REGEX = /^(?:("(?:[^"\\]|\\.)*")(: ))?(.*)$/;

/**
 * Renders a line of pretty-printed JSON with values colored by type. The line is indented
 * with padding, so that a wrapped value stays aligned with its own level.
 */
const JsonLine = ({ line }: { line: string }) => {
  const text = line.trimStart();
  const depth = (line.length - text.length) / 2;
  const [, key = "", separator = "", value = ""] = LINE_REGEX.exec(text) ?? [];
  const color = valueColor(value);
  const chunks: string[] = [];
  for (let i = 0; i < Math.max(value.length, 1); i += MAX_CHUNK_LENGTH) {
    chunks.push(value.slice(i, i + MAX_CHUNK_LENGTH));
  }

  return (
    <View style={{ paddingLeft: depth * INDENT_WIDTH }}>
      {chunks.map((chunk, index) => (
        <IOText
          color="grey-700"
          font="FiraCode"
          key={index}
          lineHeight={18}
          selectable
          size={12}
          weight="Medium"
        >
          {index === 0 ? `${key}${separator}` : ""}
          <Text style={{ color }}>{chunk}</Text>
        </IOText>
      ))}
    </View>
  );
};

/**
 * This component allows to print the content of an object in an elegant and readable way,
 * with selectable text, and to copy its full content to the clipboard.
 * The component it is rendered only if debug mode is enabled
 */
export const DebugPrettyPrint = ({
  data,
  isExpanded = false,
  isTruncated = true,
  title,
}: Props) => {
  const [expanded, setExpanded] = useState(isExpanded);

  const content = useMemo(() => {
    if (!expanded) {
      return null;
    }

    const json = JSON.stringify(
      isTruncated
        ? truncateObjectStrings(data as TruncatableValue, MAX_STRING_LENGTH)
        : data,
      null,
      2,
    );

    return (
      <View style={styles.content}>
        {json.split("\n").map((line, index) => (
          <JsonLine key={index} line={line} />
        ))}
      </View>
    );
  }, [data, expanded, isTruncated]);

  const summary = useMemo(() => {
    const size = formatSize(JSON.stringify(data)?.length ?? 0);
    if (typeof data !== "object" || data === null) {
      return size;
    }
    const count = Object.keys(data).length;
    return `${count} ${count === 1 ? "key" : "keys"} · ${size}`;
  }, [data]);

  return (
    <View style={styles.container} testID="DebugPrettyPrintTestID">
      <View style={styles.header}>
        <View style={styles.title}>
          <BodySmall color="white" weight="Semibold">
            {title}
          </BodySmall>
          <BodySmall color="grey-300">{summary}</BodySmall>
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
            onPress={() => setExpanded((_) => !_)}
          />
        </HStack>
      </View>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 4,
    overflow: "hidden",
  },
  content: {
    backgroundColor: IOColors["grey-50"],
    padding: 8,
  },
  header: {
    alignItems: "center",
    backgroundColor: IOColors["grey-850"],
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  title: {
    flex: 1,
  },
});
