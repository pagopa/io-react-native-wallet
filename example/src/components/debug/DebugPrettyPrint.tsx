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
import { StyleSheet, View } from "react-native";

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
  title: string;
};

/**
 * This component allows to print the content of an object in an elegant and readable way.
 * and to copy its content to the clipboard by pressing on the title.
 * The component it is rendered only if debug mode is enabled
 */
export const DebugPrettyPrint = ({
  data,
  expandable = true,
  isExpanded = false,
  title,
}: Props) => {
  const [expanded, setExpanded] = useState(isExpanded);

  const content = useMemo(() => {
    if ((expandable && !expanded) || !expandable) {
      return null;
    }

    return (
      <View pointerEvents="box-only" style={styles.content}>
        <IOText
          color={"grey-700"}
          font="DMMono"
          lineHeight={18}
          size={12}
          weight="Medium"
        >
          {JSON.stringify(truncateObjectStrings(data), null, 2)}
        </IOText>
      </View>
    );
  }, [data, expandable, expanded]);

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
    borderRadius: 4,
    marginVertical: 4,
    overflow: "hidden",
  },
  content: {
    backgroundColor: IOColors["grey-50"],
    padding: 8,
  },
  header: {
    backgroundColor: IOColors["error-600"],
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
});
