import { IOColors } from "@pagopa/io-app-design-system";
import React from "react";
import { StyleSheet, View } from "react-native";

const TOTAL_DOTS = 12;

interface CieReadingProgressProps {
  /** The reading progress, from 0 to 1 */
  progress: number;
}

/**
 * Displays the CIE reading progress as a single row of dots.
 */
export const CieReadingProgress = ({ progress }: CieReadingProgressProps) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const filledDots = Math.floor(clampedProgress * TOTAL_DOTS);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: clampedProgress * 100 }}
      style={styles.container}
    >
      {Array.from({ length: TOTAL_DOTS }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i < filledDots && styles.filledDot]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  dot: {
    borderColor: IOColors["blueIO-500"],
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    width: 10,
  },
  filledDot: {
    backgroundColor: IOColors["blueIO-500"],
  },
});
