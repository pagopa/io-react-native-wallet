import { createSelector, createSlice } from "@reduxjs/toolkit";
import { persistReducer, type PersistConfig } from "redux-persist";
import { getAttestationThunk } from "../../thunks/attestation";
import { createSecureStorage } from "../storage";
import type { AsyncStatus, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import { instanceReset } from "./instance";
import { sessionReset } from "./sesssion";
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";

// State type definition for the attestion slice
type AttestationState = {
  attestation: string | undefined;
  asyncStatus: AsyncStatus;
};

// Initial state for the attestation slice
const initialState: AttestationState = {
  attestation: undefined,
  asyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the attestion state. It contains the obtained attestation.
 * Currently it is not persisted or reused since each operation requires a new attestation.
 */
const attestationSlice = createSlice({
  name: "attestation",
  initialState,
  reducers: {
    attestationReset: () => initialState, // Reset the attestation state
  },
  extraReducers: (builder) => {
    // Dispatched when a get attestion async thunk resolves. Sets the attestation and resets the state.
    builder.addCase(getAttestationThunk.fulfilled, (state, action) => {
      state.asyncStatus.isDone = true;
      state.attestation = action.payload;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a get attestion async thunk is pending. Sets the loading state to true and resets done and hasError.
    builder.addCase(getAttestationThunk.pending, (state) => {
      // Sets the loading state and resets done and hasError;
      state.asyncStatus.isLoading = true;
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a get attestion async thunk rejects. Sets the attestation state to hasError and resets loading and isDone.
    builder.addCase(getAttestationThunk.rejected, (state, action) => {
      // Sets the hasError state and resets done and loading.
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = { status: true, error: action.error };
    });

    // Reset the attestation state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the attestaion slice.
 */
export const { attestationReset } = attestationSlice.actions;

/**
 * Persist configuration for the attestation slice.
 */
const persistConfig: PersistConfig<AttestationState> = {
  key: "attestation",
  storage: createSecureStorage(),
  whitelist: ["attestation"],
};

/**
 * Persisted reducer for the credential slice.
 */
export const attestationReducer = persistReducer(
  persistConfig,
  attestationSlice.reducer
);

/**
 * Selector which returns the attestation state of the related async operation.
 * @param state - The root state of the Redux store
 * @returns the attestion state
 */
export const selectAttestationAsyncStatus = (state: RootState) =>
  state.attestation.asyncStatus;

/**
 * Selects the attestation from the attestation state.
 * @param state - The root state of the Redux store
 * @returns the attestation
 */
export const selectAttestation = (state: RootState) =>
  state.attestation.attestation;

/**
 * Checks if the Wallet Instance Attestation needs to be requested by
 * checking the expiry date
 * @param state - the root state of the Redux store
 * @returns true if the Wallet Instance Attestation is expired or not present
 */
export const shouldRequestAttestationSelector = createSelector(
  selectAttestation,
  (attestation) => {
    if (!attestation) {
      return true;
    }
    const { payload } = WalletInstanceAttestation.decode(attestation);
    const expiryDate = new Date(payload.exp * 1000);
    const now = new Date();
    return now > expiryDate;
  }
);
