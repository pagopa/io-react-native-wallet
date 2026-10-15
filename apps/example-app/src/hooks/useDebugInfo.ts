import { useFocusEffect } from "@react-navigation/native";
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
 * Sets debug data for the mounted component. Removes it when the component is unmounted
 * @param data Data to be displayes in debug mode
 */
export const useDebugInfo = (data: Record<string, unknown>) => {
  const dispatch = useAppDispatch();

  useFocusEffect(
    React.useCallback(() => {
      dispatch(setDebugData(toSerializable(data)));

      return () => {
        dispatch(resetDebugData(Object.keys(data)));
      };
    }, [dispatch, data]),
  );
};
