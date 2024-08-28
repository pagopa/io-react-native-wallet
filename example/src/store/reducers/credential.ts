import { createSlice } from "@reduxjs/toolkit";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCredentialStatusAttestationThunk,
  getCredentialThunk,
} from "../../thunks/credential";
import {
  continueCieL3FlowThunk,
  prepareCieL3FlowParamsThunk,
  type PrepareCieL3FlowParamsThunkOutput,
} from "../../thunks/pidCieL3";
import type {
  CredentialResult,
  RootState,
  SupportedCredentials,
  AsyncStatus,
} from "../types";
import { asyncStatusInitial } from "../utilts";
import { sessionReset } from "./sesssion";
import { instanceReset } from "./instance";

/**
 * State type definition for the credential slice.
 * It contains:
 * - credentials: the obtained credentials which are persisted
 * - credentialsState: the state of the async operation to get each credential
 * - pidCiel3FlowParams: the parameters for the CiE L3 flow
 * - statusAttestation: the status attestation for the credentials
 * - statusAttAsyncStatus: the state of the async operation to get each credential status attestation
 */
type CredentialState = {
  credentials: Record<SupportedCredentials, CredentialResult | undefined>;
  credentialsAsyncStatus: Record<SupportedCredentials, AsyncStatus>;
  pidCiel3FlowParams: PrepareCieL3FlowParamsThunkOutput | undefined;
  statusAttestation: Record<SupportedCredentials, string | undefined>;
  statusAttAsyncStatus: Record<SupportedCredentials, AsyncStatus>;
};

// Initial state for the credential slice
const initialState: CredentialState = {
  credentials: {
    PersonIdentificationData: undefined,
    MDL: undefined,
    EuropeanDisabilityCard: undefined,
  },
  credentialsAsyncStatus: {
    PersonIdentificationData: asyncStatusInitial,
    MDL: asyncStatusInitial,
    EuropeanDisabilityCard: asyncStatusInitial,
  },
  pidCiel3FlowParams: undefined,
  statusAttestation: {
    PersonIdentificationData: undefined,
    MDL: undefined,
    EuropeanDisabilityCard: undefined,
  },
  statusAttAsyncStatus: {
    PersonIdentificationData: asyncStatusInitial,
    MDL: asyncStatusInitial,
    EuropeanDisabilityCard: asyncStatusInitial,
  },
};

/**
 * Redux slice for the attestion state. It contains the credentials, the credential async operation state, the CiE L3 flow params,
 * the status attestation of the credentials and the status attestation async operation state.
 */
const credentialSlice = createSlice({
  name: "credential",
  initialState,
  reducers: {
    credentialReset: () => initialState,
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
    builder.addCase(getCredentialThunk.fulfilled, (state, action) => {
      const credentialType = action.payload.credentialType;
      // Set the credential
      state.credentials[credentialType] = action.payload;
      // Set the status
      state.credentialsAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /*
     * Dispatched when a get credential async thunk is pending.
     * Sets the credential state to isLoading while resetting isDone and hasError
     * for the requested credential.
     */
    builder.addCase(getCredentialThunk.pending, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.credentialsAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /*
     * Dispatched when a get credential async thunk rejected.
     * Sets the credential state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(getCredentialThunk.rejected, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.credentialsAsyncStatus[credentialType] = {
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
      state.credentialsAsyncStatus.PersonIdentificationData = {
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
      state.credentialsAsyncStatus.PersonIdentificationData = {
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
      state.credentials.PersonIdentificationData = action.payload;
      state.credentialsAsyncStatus.PersonIdentificationData = {
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
      state.credentialsAsyncStatus.PersonIdentificationData = {
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
      state.credentialsAsyncStatus.PersonIdentificationData = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /**
     * Status Attestation Thunk
     */

    /* Dispatched when a getCredentialStatusAttestationThunk thunk resolves.
     * Sets the status attestation and its state to isDone for the requested credential while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAttestationThunk.fulfilled,
      (state, action) => {
        const credentialType = action.payload.credentialType;
        // Set the credential
        state.statusAttestation[credentialType] =
          action.payload.statusAttestation;
        // Set the status
        state.statusAttAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          isDone: true,
        };
      }
    );

    /* Dispatched when a getCredentialStatusAttestationThunk thunk is pending.
     * Sets the status attestation state to isLoading while resetting isDone and hasError
     * for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAttestationThunk.pending,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAttAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          isLoading: true,
        };
      }
    );

    /* Dispatched when a getCredentialStatusAttestationThunk thunk rejected.
     * Sets the status attestation state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAttestationThunk.rejected,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAttAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          hasError: { status: true, error: action.error },
        };
      }
    );

    // Reset the credential state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the credential state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the credential slice.
 */
export const { credentialReset, pidCiel3FlowReset } = credentialSlice.actions;

/**
 * Persist configuration for the credential slice.
 * We only persist the obtained credentials.
 */
const persistConfig: PersistConfig<CredentialState> = {
  key: "credential",
  storage: AsyncStorage,
  whitelist: ["credentials"],
};

/**
 * Persisted reducer for the credential slice.
 */
export const credentialReducer = persistReducer(
  persistConfig,
  credentialSlice.reducer
);

/**
 * Selects a credential from the credential state.
 * @param credentialType - The type of the credential to select
 * @returns the selected credential as {@link CredentialResult}
 */
export const selectCredential =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.credentials[credentialType];

/**
 * Selects the state of the async operation of a given credential.
 * @param credentialType - The type of the credential to select the state
 * @returns the state of the async operation for the requested credential as {@link AsyncStatus}
 */
export const selectCredentialAsyncStatus =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.credentialsAsyncStatus[credentialType];

/**
 * Selects the status attestation of a given credential.
 * @param credentialType - The type of the credential to select the status attestation
 * @returns the status attestation for the requested credential
 */
export const selectStatusAttestation =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.statusAttestation[credentialType];

/**
 * Selects the state of the status attestation async operation of a given credential.
 * @param credentialType - The type of the credential to select the state
 * @returns the state of the async operation for the requested credential as {@link AsyncStatus}
 */
export const selectStatusAttestationAsyncStatus =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.statusAttAsyncStatus[credentialType];

/**
 * Selects the CiE L3 flow params from the credential state.
 * @param state - The root state of the Redux store
 * @returns the CiE L3 flow params
 */
export const selectPidCieL3FlowParams = (state: RootState) => {
  return state.credential.pidCiel3FlowParams;
};
