import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  debugDataSelector,
  debugVisibilitySelector,
  setDebugVisibility,
} from "../../store/reducers/debug";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { DebugPrettyPrint } from "./DebugPrettyPrint";

export const DebugDataOverlay = () => {
  const debugData = useAppSelector(debugDataSelector);
  const isDebugDataVisibile = useAppSelector(debugVisibilitySelector);
  const dispatch = useAppDispatch();

  return (
    <>
      {isDebugDataVisibile && (
        <SafeAreaView style={styles.container}>
          <TouchableWithoutFeedback
            accessibilityRole="none"
            onPress={() => dispatch(setDebugVisibility(false))}
          >
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            style={styles.scroll}
          >
            {Object.entries(debugData).map(([key, value]) =>
              value ? (
                <DebugPrettyPrint
                  data={value}
                  expandable={true}
                  isExpanded={false}
                  key={`debug_data_${key}`}
                  title={key}
                />
              ) : null,
            )}
          </ScrollView>
        </SafeAreaView>
      )}
    </>
  );
};

const overlayColor = "#000000B0";

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    paddingTop: 60,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 999,
  },
  overlay: {
    backgroundColor: overlayColor,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
});
