import {
  IOSpacingScale,
  IOVisualCostants,
  ModuleIDP,
  VSpacer,
} from "@pagopa/io-app-design-system";
/**
 * A component that show a Grid with every Identity Provider passed in the idps
 * array property. When an Identity Provider is selected a callback function is called.
 */
import * as React from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";

import type { Idp, IdpList } from "../utils/idps";

interface Props {
  contentContainerStyle?: StyleProp<ViewStyle>;
  footerComponent?: React.ComponentProps<
    typeof FlatList
  >["ListFooterComponent"];
  headerComponent?: React.ComponentProps<
    typeof FlatList
  >["ListHeaderComponent"];
  headerComponentStyle?: StyleProp<ViewStyle>;
  // Array of Identity Provider to show in the grid.
  idps: IdpList;
  // A callback function called when an Identity Provider is selected
  onIdpSelected: (_: Idp) => void;
  testID?: string;
}

const GRID_GUTTER: IOSpacingScale = 8;

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: IOVisualCostants.appMarginDefault,
  },
});

const keyExtractor = (idp: Idp): string => idp.id;

const renderItem =
  (props: Props) =>
  (info: ListRenderItemInfo<Idp>): React.ReactElement => {
    const { onIdpSelected } = props;
    const { item } = info;
    const { id, localLogo, name } = item;

    const onPress = () => onIdpSelected(item);

    return (
      <ModuleIDP
        key={id}
        logo={{
          light: localLogo,
        }}
        name={name}
        onPress={onPress}
        testID={`idp-${item.id}-button`}
      />
    );
  };

const Spacer = () => <VSpacer size={GRID_GUTTER} />;

const IdpsGrid = (props: Props) => (
  <FlatList
    contentContainerStyle={styles.contentContainer}
    data={props.idps}
    horizontal={false}
    ItemSeparatorComponent={Spacer}
    keyExtractor={keyExtractor}
    ListFooterComponent={props.footerComponent}
    ListHeaderComponent={props.headerComponent}
    numColumns={1}
    renderItem={renderItem(props)}
    testID={props.testID}
  />
);

export default IdpsGrid;
