import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { useAppDispatch } from "../store/utils";
import { resetDebugData, setDebugData } from "../store/reducers/debug";

/**
 * Sets debug data for the mounted component. Removes it when the component is unmounted
 * @param data Data to be displayes in debug mode
 */
export const useDebugInfo = (data: Record<string, any>) => {
  const dispatch = useAppDispatch();

  useFocusEffect(
    React.useCallback(() => {
      dispatch(setDebugData(data));

      return () => {
        dispatch(resetDebugData(Object.keys(data)));
      };
    }, [dispatch, data])
  );
};
