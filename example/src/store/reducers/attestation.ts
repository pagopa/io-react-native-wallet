import { createSlice } from "@reduxjs/toolkit";
import { withAsyncStateInitial } from "../utilts";
import { getAttestationThunk } from "../../thunks/attestation";
import type { RootState, WithAsyncState } from "../types";

// State type definition for the session slice
type AttestationState = WithAsyncState & {
  attestation: string | undefined;
};

// Initial state for the session slice
const initialState: AttestationState = {
  attestation: undefined,
  ...withAsyncStateInitial,
};

/**
 * Redux slice for the session state. It contains the IO auth token.
 * Two actions are defined:
 * - sessionSet: sets the IO auth token
 * - sessionReset: resets the session state
 */
export const attestationSlice = createSlice({
  name: "attestation",
  initialState,
  reducers: {
    attestationReset: () => initialState,
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(getAttestationThunk.fulfilled, (state, action) => {
      // Add user to the state array
      state.isDone = true;
      state.attestation = action.payload;
      state.isLoading = initialState.isLoading;
      state.hasError = initialState.hasError;
    });
    builder.addCase(getAttestationThunk.pending, (state) => {
      // Add user to the state array
      state.isDone = false;
      state.isLoading = true;
      state.hasError = initialState.hasError;
    });
    builder.addCase(getAttestationThunk.rejected, (state, action) => {
      state.isDone = initialState.isDone;
      state.isLoading = initialState.isLoading;
      state.hasError = { status: true, error: action.error };
    });
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { attestationReset } = attestationSlice.actions;

export const selectAttestationState = (state: RootState) => state.attestation;

/**
 * Selects the IO auth token from the session state.
 * @param state - The root state of the Redux store
 * @returns The IO auth token
 */
export const selectAttestation = (state: RootState) =>
  state.attestation.attestation;
