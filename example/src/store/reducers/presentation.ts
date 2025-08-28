import { createSlice } from "@reduxjs/toolkit";

import { remoteCrossDevicePresentationThunk as remoteCrossDevicePresentationThunk } from "../../thunks/presentation";
import { asyncStatusInitial } from "../utils";
import type { RootState, AsyncStatus } from "../types";
import { sessionReset } from "./sesssion";

/**
 * State type definition for a single presentaion scenario
 * the state contains:
 * - async state: isLoading, isDone, hasError as defined in {@link AsyncStatus}
 */
type SinglePresentationState = {
  redirectUri: string | undefined;
  asyncStatus: AsyncStatus;
};

/**
 * State type definition for the presentation slice
 * the state contains :
 * - acceptanceState : {@link SinglePresentationState}
 * - refusalState : {@link SinglePresentationState}
 */
type PresentationState = {
  acceptanceState: SinglePresentationState;
  refusalState: SinglePresentationState;
};

/**
 * exporting a keytype of {@link PresentationState}
 */
export type PresentationStateKeys = keyof PresentationState;

// Initial state for the presentation slice
const initialState: PresentationState = {
  acceptanceState: {
    redirectUri: undefined,
    asyncStatus: { ...asyncStatusInitial },
  },
  refusalState: {
    redirectUri: undefined,
    asyncStatus: { ...asyncStatusInitial },
  },
};

/**
 * Redux slice for the presentation state which contains the key tag used to register the wallet presentation.
 */
const presentationSlice = createSlice({
  name: "presentation",
  initialState,
  reducers: {
    presentationReset: () => initialState,
  },
  extraReducers: (builder) => {
    // Dispatched when is created. Sets the key tag in the state and its state to isDone while resetting isLoading and hasError.
    builder.addCase(
      remoteCrossDevicePresentationThunk.fulfilled,
      (state, action) => {
        state[action.meta.arg.allowed].redirectUri =
          action.payload.result.redirect_uri;
        state[action.meta.arg.allowed].asyncStatus.isDone = true;
        state[action.meta.arg.allowed].asyncStatus.isLoading =
          initialState[action.meta.arg.allowed].asyncStatus.isLoading;
        state[action.meta.arg.allowed].asyncStatus.hasError =
          initialState[action.meta.arg.allowed].asyncStatus.hasError;
      }
    );

    // Dispatched when is pending. Sets the state to isLoading and resets isDone and hasError.
    builder.addCase(
      remoteCrossDevicePresentationThunk.pending,
      (state, action) => {
        state[action.meta.arg.allowed].asyncStatus.isDone = false;
        state[action.meta.arg.allowed].asyncStatus.isLoading = true;
        state[action.meta.arg.allowed].asyncStatus.hasError =
          initialState[action.meta.arg.allowed].asyncStatus.hasError;
      }
    );

    // Dispatched when is rejected. Sets the state to hasError and resets isLoading and isDone.
    builder.addCase(
      remoteCrossDevicePresentationThunk.rejected,
      (state, action) => {
        state[action.meta.arg.allowed].asyncStatus.isDone =
          initialState[action.meta.arg.allowed].asyncStatus.isDone;
        state[action.meta.arg.allowed].asyncStatus.isLoading =
          initialState[action.meta.arg.allowed].asyncStatus.isLoading;
        state[action.meta.arg.allowed].asyncStatus.hasError = {
          status: true,
          error: action.error,
        };
      }
    );

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the presentation slice.
 */
export const { presentationReset } = presentationSlice.actions;

/**
 * Persisted reducer for the presentation slice.
 */
export const presentationReducer = presentationSlice.reducer;

/**
 * Selects the presentation state from the root state.
 * @param state - The root state of the Redux store
 * @returns The presentation state as {@link AsyncStatus}
 */
export const selectPresentationAcceptanceAsyncStatus = (state: RootState) =>
  state.presentation.acceptanceState.asyncStatus;

/**
 * Selects the presentation state from the root state.
 * @param state - The root state of the Redux store
 * @returns The presentation state as {@link AsyncStatus}
 */
export const selectPresentationRefusalAsyncStatus = (state: RootState) =>
  state.presentation.refusalState.asyncStatus;
