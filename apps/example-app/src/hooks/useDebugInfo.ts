import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React from "react";

import { resetDebugData, setDebugData } from "../store/reducers/debug";
import { useAppDispatch } from "../store/utils";
import { toBase64 } from "../utils/strings";

/**
 * Converts debug data to plain JSON values, as the store requires: dates become ISO strings
 * and binary data becomes base64.
 */
const toSerializable = (
  data: Record<string, unknown>,
): Record<string, unknown> =>
  JSON.parse(
    JSON.stringify(data, (_, value: unknown) =>
      value instanceof Uint8Array ? toBase64(value) : value,
    ),
  );

/**
 * Sets debug data for the focused screen. Removes it when the screen loses focus,
 * unless the debug sheet itself is opened on top of it, as the sheet displays that data.
 * @param data Data to be displayes in debug mode
 */
export const useDebugInfo = (data: Record<string, unknown>) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      dispatch(setDebugData(toSerializable(data)));

      return () => {
        const { index, routes } = navigation.getState() ?? {};
        if (routes?.[index ?? -1]?.name !== "DebugData") {
          dispatch(resetDebugData(Object.keys(data)));
        }
      };
    }, [dispatch, data, navigation]),
  );
};
