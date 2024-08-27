import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../types";

// State type definition for the session slice
type DebugState = { debugData: Record<string, any>; isVisible: boolean };

// Initial state for the session slice
const initialState: DebugState = { debugData: {}, isVisible: false };

/**
 * Redux slice for the session state. It contains the IO auth token.
 */
export const debugSlice = createSlice({
  name: "debug",
  initialState,
  reducers: {
    setDebugVisibility: (state, action: PayloadAction<boolean>) => {
      state.isVisible = action.payload;
    },
    setDebugData: (state, action: PayloadAction<Record<string, any>>) => {
      state.debugData = action.payload;
    },
    resetDebugData: (state, action: PayloadAction<ReadonlyArray<string>>) => {
      state.debugData = Object.fromEntries(
        Object.entries(state.debugData).filter(
          ([key]) => !action.payload.includes(key)
        )
      );
    },
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { setDebugVisibility, setDebugData, resetDebugData } =
  debugSlice.actions;

export const debugDataSelector = (state: RootState) => state.debug.debugData;

export const debugVisibilitySelector = (state: RootState) =>
  state.debug.isVisible;
