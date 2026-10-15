/*
WARNING: This component is not referenced anywhere, but is used
for development purposes. for development purposes. Don't REMOVE it!
*/
import {
  BodySmall,
  HStack,
  IconButton,
  IOColors,
  IOText,
} from "@pagopa/io-app-design-system";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { TruncatableValue } from "../../utils/strings";

import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import { truncateObjectStrings } from "../../utils/strings";

type ExpandableProps =
  | {
      expandable: true;
      isExpanded?: boolean;
    }
  | {
      expandable?: false;
      isExpanded?: undefined;
    };

type Props = ExpandableProps & {
  data: unknown;
  /** Whether long strings are shortened, `true` by default */
  isTruncated?: boolean;
  title: string;
};

/**
 * This component allows to print the content of an object in an elegant and readable way,
 * with selectable text, and to copy its full content to the clipboard.
 * The component it is rendered only if debug mode is enabled
 */
export const DebugPrettyPrint = ({
  data,
  expandable = true,
  isExpanded = false,
  isTruncated = true,
  title,
}: Props) => {
  const [expanded, setExpanded] = useState(isExpanded);

  const content = useMemo(() => {
    if ((expandable && !expanded) || !expandable) {
      return null;
    }

    return (
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        horizontal
        style={styles.content}
      >
        <IOText
          color={"grey-700"}
          font="FiraCode"
          lineHeight={18}
          selectable
          size={12}
          weight="Medium"
        >
          {JSON.stringify(
            isTruncated
              ? truncateObjectStrings(data as TruncatableValue)
              : data,
            null,
            2,
          )}
        </IOText>
      </ScrollView>
    );
  }, [data, expandable, expanded, isTruncated]);

  return (
    <View style={styles.container} testID="DebugPrettyPrintTestID">
      <View style={styles.header}>
        <BodySmall color="white" weight="Semibold">
          {title}
        </BodySmall>
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
          {expandable && (
            <IconButton
              accessibilityLabel="show"
              color="contrast"
              icon={expanded ? "eyeHide" : "eyeShow"}
              iconSize={24}
              onPress={() => setExpanded((_) => !_)}
            />
          )}
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
  },
  contentContainer: {
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
});
