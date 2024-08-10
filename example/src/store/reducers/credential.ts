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
  WithAsyncState,
} from "../types";
import { withAsyncStateInitial } from "../utilts";

// State type definition for the session slice
type CredentialState = {
  credentials: Record<SupportedCredentials, CredentialResult | undefined>;
  credentialsState: Record<SupportedCredentials, WithAsyncState>;
  pidCiel3FlowParams: {
    params: PrepareCieL3FlowParamsThunkOutput | undefined;
    isDone: boolean;
  };
  statusAttestation: Record<SupportedCredentials, string | undefined>;
  statusAttestationState: Record<SupportedCredentials, WithAsyncState>;
};

// Initial state for the session slice
const initialState: CredentialState = {
  credentials: {
    PersonIdentificationData: undefined,
    MDL: undefined,
    EuropeanDisabilityCard: undefined,
  },
  credentialsState: {
    PersonIdentificationData: withAsyncStateInitial,
    MDL: withAsyncStateInitial,
    EuropeanDisabilityCard: withAsyncStateInitial,
  },
  pidCiel3FlowParams: {
    params: undefined,
    isDone: false,
  },
  statusAttestation: {
    PersonIdentificationData: undefined,
    MDL: undefined,
    EuropeanDisabilityCard: undefined,
  },
  statusAttestationState: {
    PersonIdentificationData: withAsyncStateInitial,
    MDL: withAsyncStateInitial,
    EuropeanDisabilityCard: withAsyncStateInitial,
  },
};
/**
 * Redux slice for the session state. It contains the IO auth token.
 * Two actions are defined:
 * - sessionSet: sets the IO auth token
 * - sessionReset: resets the session state
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
    builder.addCase(getCredentialThunk.fulfilled, (state, action) => {
      const credentialType = action.payload.credentialType;
      // Set the credential
      state.credentials[credentialType] = action.payload;
      // Set the status
      state.credentialsState[credentialType] = {
        ...withAsyncStateInitial,
        isDone: true,
      };
    });
    builder.addCase(getCredentialThunk.pending, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.credentialsState[credentialType] = {
        ...withAsyncStateInitial,
        isLoading: true,
      };
    });
    builder.addCase(getCredentialThunk.rejected, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.credentialsState[credentialType] = {
        ...withAsyncStateInitial,
        hasError: { status: true, error: action.error },
      };
    });
    /**
     * CiE L3 Flow Params Thunk
     */

    builder.addCase(prepareCieL3FlowParamsThunk.fulfilled, (state, action) => {
      state.pidCiel3FlowParams = { params: action.payload, isDone: true };
      // we are not done yet here, continueFlow must be called after
    });
    builder.addCase(prepareCieL3FlowParamsThunk.pending, (state) => {
      state.pidCiel3FlowParams = {
        params: state.pidCiel3FlowParams.params,
        isDone: false,
      };
      state.credentialsState.PersonIdentificationData = {
        ...withAsyncStateInitial,
        isLoading: true,
      };
    });
    builder.addCase(prepareCieL3FlowParamsThunk.rejected, (state, action) => {
      state.pidCiel3FlowParams = initialState.pidCiel3FlowParams;
      state.credentialsState.PersonIdentificationData = {
        ...withAsyncStateInitial,
        hasError: { status: true, error: action.error },
      };
    });
    builder.addCase(continueCieL3FlowThunk.fulfilled, (state, action) => {
      state.pidCiel3FlowParams = initialState.pidCiel3FlowParams;
      state.credentials.PersonIdentificationData = action.payload;
      state.credentialsState.PersonIdentificationData = {
        ...withAsyncStateInitial,
        isDone: true,
      };
    });
    builder.addCase(continueCieL3FlowThunk.pending, (state) => {
      // Redundant as already set by prepareCieL3FlowParams but we want to be explicit and set the loading state
      state.credentialsState.PersonIdentificationData = {
        ...withAsyncStateInitial,
        isLoading: true,
      };
    });
    builder.addCase(continueCieL3FlowThunk.rejected, (state, action) => {
      // Reset the flow params if an error occurs, you must start from scratch
      state.pidCiel3FlowParams = initialState.pidCiel3FlowParams;
      state.credentialsState.PersonIdentificationData = {
        ...withAsyncStateInitial,
        hasError: { status: true, error: action.error },
      };
    });
    /**
     * Status Attestation Thunk
     */
    builder.addCase(
      getCredentialStatusAttestationThunk.fulfilled,
      (state, action) => {
        const credentialType = action.payload.credentialType;
        // Set the credential
        state.statusAttestation[credentialType] =
          action.payload.statusAttestation;
        // Set the status
        state.statusAttestationState[credentialType] = {
          ...withAsyncStateInitial,
          isDone: true,
        };
      }
    );
    builder.addCase(
      getCredentialStatusAttestationThunk.pending,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAttestationState[credentialType] = {
          ...withAsyncStateInitial,
          isLoading: true,
        };
      }
    );
    builder.addCase(
      getCredentialStatusAttestationThunk.rejected,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAttestationState[credentialType] = {
          ...withAsyncStateInitial,
          hasError: { status: true, error: action.error },
        };
      }
    );
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { credentialReset, pidCiel3FlowReset } = credentialSlice.actions;

const persistConfig: PersistConfig<CredentialState> = {
  key: "credential",
  storage: AsyncStorage,
  whitelist: ["credentials"],
};

/**
 * Persisted reducer for the session slice.
 */
export const credentialReducer = persistReducer(
  persistConfig,
  credentialSlice.reducer
);

export const selectCredential =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.credentials[credentialType];

export const selectCredentialState =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.credentialsState[credentialType];

export const selectStatusAttestation =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.statusAttestation[credentialType];

export const selectStatusAttestationState =
  (credentialType: SupportedCredentials) => (state: RootState) =>
    state.credential.statusAttestationState[credentialType];

export const selectPidCieL3FlowParams = (state: RootState) => {
  return state.credential.pidCiel3FlowParams.params;
};

export const selectPidCieL3FlowState = (state: RootState) => {
  return state.credential.pidCiel3FlowParams;
};
