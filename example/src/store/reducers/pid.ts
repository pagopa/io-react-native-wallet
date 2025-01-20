import { createSlice } from "@reduxjs/toolkit";
import { persistReducer, type PersistConfig } from "redux-persist";
import { getPidThunk } from "../../thunks/pid";

import { createSecureStorage } from "../storage";
import type { AsyncStatus, PidResult, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import { instanceReset } from "./instance";
import { sessionReset } from "./sesssion";

/**
 * State type definition for the PID slice.
 * It contains:
 * - pid: the obtained PID which is persisted
 * - pidAsyncStatus: the state of the async operation to get the PID for each supported authentication method, namely spid, CiE L2 and CiE L3
 * - pidFlowParams: the parameters for the PID flow
 */
type PidState = {
  pid: PidResult | undefined;
  pidAsyncStatus: AsyncStatus;
};

// Initial state for the pid slice
const initialState: PidState = {
  pid: undefined,
  pidAsyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the pid state. It contains the pid, the pid async operation state and the CiE L3 flow params.
 */
const pidSlice = createSlice({
  name: "pid",
  initialState,
  reducers: {
    pidReset: () => initialState,
  },
  extraReducers: (builder) => {
    /**
     * PID flow Params Thunk
     */

    /* Dispatched when a get PID flow async thunk resolves.
     *  Sets the obtained pid and
     */
    builder.addCase(getPidThunk.fulfilled, (state, action) => {
      state.pid = action.payload;
      state.pidAsyncStatus = {
        ...asyncStatusInitial,
        isDone: true,
      };
      // The flow must be continued after this so we do not set isLoading for the credential state to true yet.
    });

    /*
     * Dispatched when a get PID flow params async thunk is pending.
     */
    builder.addCase(getPidThunk.pending, (state) => {
      state.pidAsyncStatus = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /* Dispatched when a get PID thunk is rejected.
     * Resets the flow params and sets the credential state to hasError while resetting isLoading and hasError
     */
    builder.addCase(getPidThunk.rejected, (state, action) => {
      state.pidAsyncStatus = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    // Reset the pid state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the pid state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

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

/**
 * Selects the pid from the state.
 * @param credentialType - The type of the credential to select
 * @returns the pid
 */
export const selectPid = (state: RootState) => state.pid.pid;

/**
 * Selects the state of the async operation for the pid.
 * @param authMethod - The type of the auth method selected to obtain the pid
 * @param state - The root state of the Redux store
 * @returns the state of the async operation for the pid for the selected auth method
 */
export const selectPidAsyncStatus = (state: RootState) =>
  state.pid.pidAsyncStatus;
