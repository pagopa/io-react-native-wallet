/**
 * A component that show a Grid with every Identity Provider passed in the idps
 * array property. When an Identity Provider is selected a callback function is called.
 */
import * as React from "react";
import {
  FlatList,
  StyleSheet,
  type ImageSourcePropType,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  VSpacer,
  IOSpacingScale,
  ModuleIDP,
  IOVisualCostants,
} from "@pagopa/io-app-design-system";
import type { Idp, IdpList } from "../utils/idps";

type Props = {
  contentContainerStyle?: StyleProp<ViewStyle>;
  footerComponent?: React.ComponentProps<
    typeof FlatList
  >["ListFooterComponent"];
  headerComponentStyle?: StyleProp<ViewStyle>;
  headerComponent?: React.ComponentProps<
    typeof FlatList
  >["ListHeaderComponent"];
  // Array of Identity Provider to show in the grid.
  idps: IdpList;
  // A callback function called when an Identity Provider is selected
  onIdpSelected: (_: Idp) => void;
  testID?: string;
};

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
    const { id, name, logo, localLogo } = item;

    const onPress = () => onIdpSelected(item);

    return (
      <ModuleIDP
        key={id}
        name={name}
        logo={logo as ImageSourcePropType}
        localLogo={localLogo as ImageSourcePropType}
        onPress={onPress}
        testID={`idp-${item.id}-button`}
      />
    );
  };

const IdpsGrid = (props: Props) => (
  <FlatList
    testID={props.testID}
    data={props.idps}
    numColumns={1}
    horizontal={false}
    keyExtractor={keyExtractor}
    renderItem={renderItem(props)}
    ItemSeparatorComponent={() => <VSpacer size={GRID_GUTTER} />}
    contentContainerStyle={styles.contentContainer}
    ListHeaderComponent={props.headerComponent}
    ListFooterComponent={props.footerComponent}
  />
);

export default IdpsGrid;
