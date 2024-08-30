import React, { useCallback, useEffect, useState } from "react";
import type { AsyncStatus } from "../store/types";
import {
  Badge,
  IOIcons,
  ModuleCredential,
  useIOToast,
} from "@pagopa/io-app-design-system";

export type TestScenarioProp = {
  title: string;
  onPress: () => void;
  icon: IOIcons;
  isPresent?: boolean;
} & AsyncStatus;

export default function TestScenario({
  title,
  onPress,
  isLoading,
  hasError,
  icon,
  isPresent = false,
}: TestScenarioProp) {
  const [hasLoaded, setHasLoaded] = useState(false); // This in needed to avoid the error toast to be shown on the first render
  const useToast = useIOToast();

  useEffect(() => {
    if (hasError.status && hasLoaded) {
      useToast.error(`An error occured, check the debug info`);
      setHasLoaded(false);
    }
  }, [hasError, hasLoaded, useToast]);

  useEffect(() => {
    if (isLoading) {
      setHasLoaded(true);
    }
  }, [isLoading]);

  const getBadge = useCallback((): Badge | undefined => {
    if (isPresent) {
      return { text: "OBTAINED", variant: "success" };
    } else if (hasError.status) {
      return { text: "ERROR", variant: "error" };
    } else {
      return undefined;
    }
  }, [hasError, isPresent]);

  return (
    <>
      <ModuleCredential
        label={title}
        icon={icon}
        onPress={onPress}
        isFetching={isLoading}
        badge={getBadge()}
      />
    </>
  );
}
