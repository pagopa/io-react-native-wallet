/*
WARNING: This component is not referenced anywhere, but is used
for development purposes. for development purposes. Don't REMOVE it!
*/
import {
  HStack,
  IOColors,
  IconButton,
  LabelSmall,
  useTypographyFactory,
} from "@pagopa/io-app-design-system";
import React from "react";
import { StyleSheet, View } from "react-native";
import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import _ from "lodash";

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

const MAX_CHARACTERS = 256;

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
  const [expanded, setExpanded] = React.useState(isExpanded);
  const clipboardData = React.useMemo(() => JSON.stringify(data), [data]);
  const prettyData = React.useMemo(() => {
    try {
      const json = JSON.parse(JSON.stringify(data));
      return JSON.stringify(
        _.cloneDeepWith(json, (value) =>
          typeof value === "string"
            ? _.truncate(value, { length: MAX_CHARACTERS })
            : undefined
        ),
        null,
        2
      );
    } catch (e) {
      const value = JSON.stringify(data, null, 2);
      return _.truncate(value, { length: MAX_CHARACTERS });
    }
  }, [data]);

  const content = React.useMemo(() => {
    if ((expandable && !expanded) || !expandable) {
      return null;
    }
    return (
      <View style={styles.content} pointerEvents="box-only">
        <CustomBodyMonospace>{prettyData}</CustomBodyMonospace>
      </View>
    );
  }, [prettyData, expandable, expanded]);

  return (
    <View testID="DebugPrettyPrintTestID" style={styles.container}>
      <View style={styles.header}>
        <LabelSmall weight="Bold" color="white">
          {title}
        </LabelSmall>
        <HStack space={16}>
          <IconButton
            icon={"copy"}
            accessibilityLabel="copy"
            onPress={() => clipboardSetStringWithFeedback(clipboardData)}
            color="contrast"
          />
          {expandable && (
            <IconButton
              icon={expanded ? "chevronTop" : "chevronBottom"}
              accessibilityLabel="expand"
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

const CustomBodyMonospace = (props: { children?: React.ReactNode }) =>
  useTypographyFactory({
    ...props,
    defaultWeight: "Medium",
    defaultColor: "bluegrey",
    font: "DMMono",
    fontStyle: { fontSize: 12, lineHeight: 18 },
  });

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
