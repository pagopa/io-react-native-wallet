import {
  Badge,
  IOIcons,
  ModuleCredential,
  useIOToast,
} from "@pagopa/io-app-design-system";
import React, { useCallback, useEffect, useState } from "react";

import type { AsyncStatus } from "../store/types";

export type TestScenarioProp = {
  icon: IOIcons;
  isPresent?: boolean;
  onPress: () => void;
  successMessage?: string;
  title: string;
} & AsyncStatus;

export default function TestScenario({
  hasError,
  icon,
  isLoading,
  isPresent = false,
  onPress,
  successMessage = "OBTAINED",
  title,
}: TestScenarioProp) {
  const [hasLoaded, setHasLoaded] = useState(false); // This in needed to avoid the error toast to be shown on the first render
  const toast = useIOToast();

  useEffect(() => {
    if (hasError.status && hasLoaded) {
      toast.error(`An error occurred, check the debug info`);
      setHasLoaded(false);
    }
  }, [hasError, hasLoaded, toast]);

  useEffect(() => {
    if (isLoading) {
      setHasLoaded(true);
    }
  }, [isLoading]);

  const getBadge = useCallback((): Badge | undefined => {
    if (isPresent) {
      return { text: successMessage, variant: "success" };
    } else if (hasError.status) {
      return { text: "ERROR", variant: "error" };
    } else {
      return undefined;
    }
  }, [hasError, isPresent, successMessage]);

  return (
    <ModuleCredential
      badge={getBadge()}
      icon={icon}
      isFetching={isLoading}
      label={title}
      onPress={onPress}
    />
  );
}
