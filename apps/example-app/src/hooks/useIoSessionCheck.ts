import { useEffect } from "react";
import { AppState } from "react-native";

import { selectIoAuthToken } from "../store/reducers/session";
import { useAppSelector } from "../store/utils";
import { checkIoSession } from "../utils/fetch";

/**
 * Checks the IO session validity when the user is logged in and every time the app returns to the foreground,
 * so that a login on another device or app logs the user out, like IO does.
 */
export const useIoSessionCheck = () => {
  const ioAuthToken = useAppSelector(selectIoAuthToken);

  useEffect(() => {
    if (!ioAuthToken) return;

    // Network errors are ignored, only an explicit 401 invalidates the session
    const check = () => checkIoSession().catch(() => undefined);
    check();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, [ioAuthToken]);
};
