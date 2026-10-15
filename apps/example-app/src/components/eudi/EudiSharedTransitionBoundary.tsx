import { useIsFocused } from "@react-navigation/native";
import React from "react";
import { SharedTransitionBoundary } from "react-native-reanimated";

/**
 * Boundary of the shared element transitions of a screen: Reanimated matches the elements with the same
 * `sharedTransitionTag` only between boundaries, the active one being the boundary of the focused screen.
 */
export const EudiSharedTransitionBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isFocused = useIsFocused();
  return (
    <SharedTransitionBoundary isActive={isFocused}>
      {children}
    </SharedTransitionBoundary>
  );
};
