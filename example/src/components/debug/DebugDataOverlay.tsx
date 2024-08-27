import { useAppDispatch, useAppSelector } from "../../store/utils";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DebugPrettyPrint } from "./DebugPrettyPrint";
import {
  debugDataSelector,
  debugVisibilitySelector,
  setDebugVisibility,
} from "../../store/reducers/debug";

export const DebugDataOverlay = () => {
  const debugData = useAppSelector(debugDataSelector);
  const isDebugDataVisibile = useAppSelector(debugVisibilitySelector);
  const dispatch = useAppDispatch();

  return (
    <>
      {isDebugDataVisibile && (
        <SafeAreaView style={styles.container}>
          <TouchableWithoutFeedback
            onPress={() => dispatch(setDebugVisibility(false))}
            accessibilityRole="none"
          >
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContainer}
          >
            {Object.entries(debugData).map(([key, value]) =>
              value ? (
                <DebugPrettyPrint
                  key={`debug_data_${key}`}
                  title={key}
                  data={value}
                  expandable={true}
                  isExpanded={false}
                />
              ) : null
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
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingTop: 60,
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: overlayColor,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
});
