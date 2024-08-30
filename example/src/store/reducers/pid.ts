import { createSlice } from "@reduxjs/toolkit";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  continueCieL3FlowThunk,
  prepareCieL3FlowParamsThunk,
  type PrepareCieL3FlowParamsThunkOutput,
} from "../../thunks/pidCieL3";
import type {
  RootState,
  AsyncStatus,
  PidAuthMethods,
  PidResult,
} from "../types";
import { asyncStatusInitial } from "../utils";
import { sessionReset } from "./sesssion";
import { instanceReset } from "./instance";
import { getPidThunk } from "../../thunks/pid";

/**
 * State type definition for the credential slice.
 * It contains:
 * - credentials: the obtained credentials which are persisted
 * - credentialsState: the state of the async operation to get each credential
 * - pidCiel3FlowParams: the parameters for the CiE L3 flow
 * - statusAttestation: the status attestation for the credentials
 * - statusAttAsyncStatus: the state of the async operation to get each credential status attestation
 */
type PidState = {
  pid: PidResult | undefined;
  pidAsyncStatus: Record<PidAuthMethods, AsyncStatus>;
  pidCiel3FlowParams: PrepareCieL3FlowParamsThunkOutput | undefined;
};

// Initial state for the credential slice
const initialState: PidState = {
  pid: undefined,
  pidAsyncStatus: {
    spid: asyncStatusInitial,
    cieL2: asyncStatusInitial,
    cieL3: asyncStatusInitial,
  },
  pidCiel3FlowParams: undefined,
};

/**
 * Redux slice for the attestion state. It contains the credentials, the credential async operation state, the CiE L3 flow params,
 * the status attestation of the credentials and the status attestation async operation state.
 */
const pidSlice = createSlice({
  name: "pid",
  initialState,
  reducers: {
    pidReset: () => initialState,
    pidCiel3FlowReset: (state) => ({
      ...state,
      pidCiel3FlowParams: initialState.pidCiel3FlowParams,
    }),
  },
  extraReducers: (builder) => {
    /**
     * Credential Thunk
     */

    /*
     * Dispatched when a get credential async thunk resolves.
     * Sets the obtained credential and its state to isDone
     * for the requested credential.
     */
    builder.addCase(getPidThunk.fulfilled, (state, action) => {
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
     * Dispatched when a get credential async thunk is pending.
     * Sets the credential state to isLoading while resetting isDone and hasError
     * for the requested credential.
     */
    builder.addCase(getPidThunk.pending, (state, action) => {
      const authMethod = action.meta.arg.authMethod;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /*
     * Dispatched when a get credential async thunk rejected.
     * Sets the credential state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(getPidThunk.rejected, (state, action) => {
      const authMethod = action.meta.arg.authMethod;
      state.pidAsyncStatus[authMethod] = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /**
     * CiE L3 Flow Params Thunk
     */

    /* Dispatched when a prepare CiE L3 flow params async thunk resolves.
     *  Sets the obtained params and its state to isDone while resetting isLoading and hasError
     * for the PID.
     */
    builder.addCase(prepareCieL3FlowParamsThunk.fulfilled, (state, action) => {
      state.pidCiel3FlowParams = action.payload;
      // The flow must be continued after this so we do not set isLoading for the credential state to true yet.
    });

    /*
     * Dispatched when a prepare CiE L3 flow params async thunk is pending.
     * Sets the flow params and the credential state to isLoading
     * for the PID.
     */
    builder.addCase(prepareCieL3FlowParamsThunk.pending, (state) => {
      state.pidAsyncStatus.cieL3 = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /* Dispatched when a prepare CiE L3 flow params async thunk rejected.
     * Resets the flow params and sets the credential state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(prepareCieL3FlowParamsThunk.rejected, (state, action) => {
      state.pidCiel3FlowParams = initialState.pidCiel3FlowParams;
      state.pidAsyncStatus.cieL3 = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /* Dispatched when a continue CiE L3 flow async thunk resolves.
     * Resets the flow params and sets the obtained credential and sets its state to isDone while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(continueCieL3FlowThunk.fulfilled, (state, action) => {
      state.pidCiel3FlowParams = initialState.pidCiel3FlowParams;
      state.pid = action.payload;
      state.pidAsyncStatus.cieL3 = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /* Dispatched when a continue CiE L3 flow async thunk is pending.
     * Sets the credential state to isLoading while resetting isDone and hasError
     * for the requested credential.
     */
    builder.addCase(continueCieL3FlowThunk.pending, (state) => {
      // Redundant as already set by prepareCieL3FlowParams but we want to be explicit and set the loading state
      state.pidAsyncStatus.cieL3 = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /* Dispatched when a continue CiE L3 flow async thunk rejected.
     * Resets the flow params and sets the credential state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(continueCieL3FlowThunk.rejected, (state, action) => {
      // Reset the flow params if an error occurs, you must start from scratch
      state.pidCiel3FlowParams = initialState.pidCiel3FlowParams;
      state.pidAsyncStatus.cieL3 = {
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
 * Exports the actions for the credential slice.
 */
export const { pidCiel3FlowReset } = pidSlice.actions;

/**
 * Persist configuration for the credential slice.
 * We only persist the obtained credentials.
 */
const persistConfig: PersistConfig<PidState> = {
  key: "pid",
  storage: AsyncStorage,
  whitelist: ["pid"],
};

/**
 * Persisted reducer for the credential slice.
 */
export const pidReducer = persistReducer(persistConfig, pidSlice.reducer);

/**
 * Selects a credential from the credential state.
 * @param credentialType - The type of the credential to select
 * @returns the selected credential as {@link CredentialResult}
 */
export const selectPid = (state: RootState) => state.pid.pid;

/**
 * Selects the state of the async operation of a given credential.
 * @param credentialType - The type of the credential to select the state
 * @returns the state of the async operation for the requested credential as {@link AsyncStatus}
 */
export const selectPidAsyncStatus =
  (authMethod: PidAuthMethods) => (state: RootState) =>
    state.pid.pidAsyncStatus[authMethod];
/**
 * Selects the CiE L3 flow params from the credential state.
 * @param state - The root state of the Redux store
 * @returns the CiE L3 flow params
 */
export const selectPidCieL3FlowParams = (state: RootState) => {
  return state.credential.pidCiel3FlowParams;
};
