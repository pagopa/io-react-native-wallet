import { createSlice } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, PidResult } from "../types";

import { getPidThunk } from "../../thunks/pid";
import { instanceReset } from "../instance";
import { createSecureStorage } from "../storage";
import { asyncStatusInitial } from "../utils";

/**
 * State type definition for the PID slice.
 * It contains:
 * - pid: the obtained PID which is persisted
 * - pidAsyncStatus: the state of the async operation to get the PID
 */
export interface PidState {
  pid: PidResult | undefined;
  pidAsyncStatus: AsyncStatus;
}

// Initial state for the pid slice
const initialState: PidState = {
  pid: undefined,
  pidAsyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the pid state. It contains the pid and the pid async operation state.
 */
const pidSlice = createSlice({
  extraReducers: (builder) => {
    // Dispatched when the PID issuance starts. Sets the state to isLoading.
    builder.addCase(getPidThunk.pending, (state) => {
      state.pidAsyncStatus = { ...asyncStatusInitial, isLoading: true };
    });

    // Dispatched when the PID is obtained. Sets the PID and the state to isDone.
    builder.addCase(getPidThunk.fulfilled, (state, action) => {
      state.pid = action.payload;
      state.pidAsyncStatus = { ...asyncStatusInitial, isDone: true };
    });

    // Dispatched when the PID issuance fails. Sets the state to hasError.
    builder.addCase(getPidThunk.rejected, (state, action) => {
      state.pidAsyncStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });

    // Reset the pid state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);
  },
  initialState,
  name: "pid",
  reducers: {
    pidReset: () => initialState,
  },
});

export const { pidReset } = pidSlice.actions;

/**
 * Persist configuration for the pid slice.
 * We only persist the obtained pid.
 */
const persistConfig: PersistConfig<PidState> = {
  key: "pid",
  storage: createSecureStorage(),
  whitelist: ["pid"],
};

/**
 * Persisted reducer for the pid slice.
 */
export const pidReducer = persistReducer(persistConfig, pidSlice.reducer);
