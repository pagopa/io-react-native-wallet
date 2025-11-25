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

type Props = {
  title: string;
  data: any;
} & ExpandableProps;

/**
 * This component allows to print the content of an object in an elegant and readable way.
 * and to copy its content to the clipboard by pressing on the title.
 * The component it is rendered only if debug mode is enabled
 */
export const DebugPrettyPrint = ({
  title,
  data,
  expandable = true,
  isExpanded = false,
}: Props) => {
  const [expanded, setExpanded] = useState(isExpanded);

  const content = useMemo(() => {
    if ((expandable && !expanded) || !expandable) {
      return null;
    }

    return (
      <View style={styles.content} pointerEvents="box-only">
        <IOText
          font="FiraCode"
          size={12}
          lineHeight={18}
          color={"grey-700"}
          weight="Medium"
        >
          {JSON.stringify(truncateObjectStrings(data), null, 2)}
        </IOText>
      </View>
    );
  }, [data, expandable, expanded]);

  return (
    <View testID="DebugPrettyPrintTestID" style={styles.container}>
      <View style={styles.header}>
        <BodySmall weight="Semibold" color="white">
          {title}
        </BodySmall>
        <HStack space={16}>
          <IconButton
            icon={"copy"}
            accessibilityLabel="copy"
            iconSize={20}
            onPress={() =>
              clipboardSetStringWithFeedback(JSON.stringify(data, null, 2))
            }
            color="contrast"
          />
          {expandable && (
            <IconButton
              icon={expanded ? "eyeHide" : "eyeShow"}
              accessibilityLabel="show"
              iconSize={24}
              onPress={() => setExpanded((_) => !_)}
              color="contrast"
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
    overflow: "hidden",
    marginVertical: 4,
  },
  header: {
    backgroundColor: IOColors["error-600"],
    padding: 12,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  content: {
    backgroundColor: IOColors["grey-50"],
    padding: 8,
  },
});
