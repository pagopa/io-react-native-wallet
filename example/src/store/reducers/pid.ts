import { createSlice } from "@reduxjs/toolkit";
import { persistReducer, type PersistConfig } from "redux-persist";
import {
  continuePidFlowThunk,
  preparePidFlowParamsThunk,
} from "../../thunks/pid";

import { createSecureStorage } from "../storage";
import type {
  AsyncStatus,
  PidAuthMethods,
  PidResult,
  RootState,
} from "../types";
import { asyncStatusInitial } from "../utils";
import { instanceReset } from "./instance";
import { sessionReset } from "./sesssion";
import type { PreparePidFlowParamsThunkOutput } from "example/src/thunks/pid";
import { getPidCieIDThunk } from "../../thunks/pidCieID";

/**
 * State type definition for the PID slice.
 * It contains:
 * - pid: the obtained PID which is persisted
 * - pidAsyncStatus: the state of the async operation to get the PID for each supported authentication method, namely spid, CiE L2 and CiE L3
 * - pidFlowParams: the parameters for the PID flow
 */
type PidState = {
  pid: PidResult | undefined;
  pidAsyncStatus: Record<PidAuthMethods, AsyncStatus>;
  pidFlowParams: PreparePidFlowParamsThunkOutput | undefined;
};

// Initial state for the pid slice
const initialState: PidState = {
  pid: undefined,
  pidAsyncStatus: {
    spid: asyncStatusInitial,
    cieL2: asyncStatusInitial,
    cieL3: asyncStatusInitial,
  },
  pidFlowParams: undefined,
};

/**
 * Redux slice for the pid state. It contains the pid, the pid async operation state and the CiE L3 flow params.
 */
const pidSlice = createSlice({
  name: "pid",
  initialState,
  reducers: {
    pidReset: () => initialState,
    pidCiel3FlowReset: (state) => ({
      ...state,
      pidFlowParams: initialState.pidFlowParams,
      pidAsyncStatus: {
        ...state.pidAsyncStatus,
        cieL3: asyncStatusInitial,
      },
    }),
  },
  extraReducers: (builder) => {
    /**
     * PID CieID Thunk
     */

    /*
     * Dispatched when a get pid async thunk resolves.
     * Sets the obtained pid and its state to isDone.
     */
    builder.addCase(getPidCieIDThunk.fulfilled, (state, action) => {
      const authMethod = action.meta.arg.authMethod;
      // Set the credential
      state.pid = action.payload;
      // Set the status
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /*
     * Dispatched when a get pid async thunk is pending.
     * Sets the pid state to isLoading while resetting isDone and hasError.
     */
    builder.addCase(getPidCieIDThunk.pending, (state, action) => {
      const authMethod = action.meta.arg.authMethod;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /*
     * Dispatched when a get pid async thunk rejected.
     * Sets the pid state to hasError while resetting isLoading and hasError.
     */
    builder.addCase(getPidCieIDThunk.rejected, (state, action) => {
      const authMethod = action.meta.arg.authMethod;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /**
     * PID flow Params Thunk
     */

    /* Dispatched when a prepare PID flow params async thunk resolves.
     *  Sets the obtained params and its state to isDone while resetting isLoading and hasError
     * for the PID.
     */
    builder.addCase(preparePidFlowParamsThunk.fulfilled, (state, action) => {
      state.pidFlowParams = action.payload;
      // The flow must be continued after this so we do not set isLoading for the credential state to true yet.
    });

    /*
     * Dispatched when a prepare PID flow params async thunk is pending.
     * Sets the flow params and the credential state to isLoading
     * for the PID.
     */
    builder.addCase(preparePidFlowParamsThunk.pending, (state, action) => {
      const authMethod = action.meta.arg.authMethod;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /* Dispatched when a prepare PID flow params async thunk is rejected.
     * Resets the flow params and sets the credential state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(preparePidFlowParamsThunk.rejected, (state, action) => {
      state.pidFlowParams = initialState.pidFlowParams;
      const authMethod = action.meta.arg.authMethod;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /* Dispatched when a continue PID flow async thunk resolves.
     * Sets the obtained credential and sets its state to isDone while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(continuePidFlowThunk.fulfilled, (state, action) => {
      state.pidFlowParams = initialState.pidFlowParams;
      const cieL3IsLoading = state.pidAsyncStatus.cieL3.isLoading;
      const spidIsLoading = state.pidAsyncStatus.spid.isLoading;
      const authMethod = cieL3IsLoading
        ? "cieL3"
        : spidIsLoading
        ? "spid"
        : "spid";
      state.pid = action.payload;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /* Dispatched when a continue PID flow async thunk resolves.
     * Sets the obtained credential and sets its state to isDone while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(continuePidFlowThunk.pending, (state) => {
      // Redundant as already set by preparePidFlowParams but we want to be explicit and set the loading state
      const cieL3IsLoading = state.pidAsyncStatus.cieL3.isLoading;
      const spidIsLoading = state.pidAsyncStatus.spid.isLoading;
      const authMethod = cieL3IsLoading
        ? "cieL3"
        : spidIsLoading
        ? "spid"
        : "spid";
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /* Dispatched when a continue PID flow async thunk resolves.
     * Sets the obtained credential and sets its state to isDone while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(continuePidFlowThunk.rejected, (state, action) => {
      // Reset the flow params if an error occurs, you must start from scratch
      state.pidFlowParams = initialState.pidFlowParams;
      const authMethod = action.meta.arg.authUrl.includes("cie")
        ? "cieL3"
        : "spid";
      state.pidAsyncStatus[authMethod] = {
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
 * Exports the actions for the pid slice.
 */
export const { pidCiel3FlowReset } = pidSlice.actions;

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
export const selectPidAsyncStatus =
  (authMethod: PidAuthMethods) => (state: RootState) =>
    state.pid.pidAsyncStatus[authMethod];
/**
 * Selects the CiE L3 flow params from the credential state.
 * @param state - The root state of the Redux store
 * @returns the CiE L3 flow params
 */
export const selectPidFlowParams = (state: RootState) => {
  return state.pid.pidFlowParams;
};
