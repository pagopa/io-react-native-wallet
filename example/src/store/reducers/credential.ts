import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import {
  withAsyncStateInitial,
  type SupportedCredentials,
  type WithAsyncState,
} from "../utilts";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GetCredentialThunk } from "../../thunks/utils";
import { getCredentialThunk } from "../../thunks/get-credential";

// State type definition for the session slice
type CredentialState = {
  credentials: Record<SupportedCredentials, GetCredentialThunk | undefined>;
  credentialsState: Record<SupportedCredentials, WithAsyncState>;
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
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
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
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { credentialReset } = credentialSlice.actions;

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
