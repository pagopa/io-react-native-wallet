import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "../types";

// State type definition for the session slice
export interface DebugState {
  debugData: Record<string, unknown>;
}

// Initial state for the session slice
const initialState: DebugState = { debugData: {} };

/**
 * Redux slice for the session state. It contains the IO auth token.
 */
export const debugSlice = createSlice({
  initialState,
  name: "debug",
  reducers: {
    resetDebugData: (state, action: PayloadAction<readonly string[]>) => {
      state.debugData = Object.fromEntries(
        Object.entries(state.debugData).filter(
          ([key]) => !action.payload.includes(key),
        ),
      );
    },
    setDebugData: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.debugData = action.payload;
    },
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { resetDebugData, setDebugData } = debugSlice.actions;

export const debugDataSelector = (state: RootState) => state.debug.debugData;
