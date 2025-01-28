import { createSlice } from "@reduxjs/toolkit";

import { remoteCrossDevicePresentationThunk as remoteCrossDevicePresentationThunk } from "../../thunks/presentation";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { asyncStatusInitial } from "../utils";
import type { RootState, AsyncStatus } from "../types";
import { sessionReset } from "./sesssion";

/**
 * State type definition for the presentation slice
 * the state contains:
 * - async state: isLoading, isDone, hasError as defined in {@link AsyncStatus}
 */
type PresentationState = {
  redirectUri: string | undefined;
  asyncStatus: AsyncStatus;
};

// Initial state for the presentation slice
const initialState: PresentationState = {
  redirectUri: undefined,
  asyncStatus: asyncStatusInitial,
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
        state.redirectUri = action.payload.result.redirect_uri;
        state.asyncStatus.isDone = true;
        state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
        state.asyncStatus.hasError = initialState.asyncStatus.hasError;
      }
    );

    // Dispatched when is pending. Sets the state to isLoading and resets isDone and hasError.
    builder.addCase(remoteCrossDevicePresentationThunk.pending, (state) => {
      state.asyncStatus.isDone = false;
      state.asyncStatus.isLoading = true;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when is rejected. Sets the state to hasError and resets isLoading and isDone.
    builder.addCase(
      remoteCrossDevicePresentationThunk.rejected,
      (state, action) => {
        state.asyncStatus.isDone = initialState.asyncStatus.isDone;
        state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
        state.asyncStatus.hasError = { status: true, error: action.error };
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
 * Configuration for the presentation slice to be persisted in the Redux store.
 * Only the keyTag is persisted to avoid regenerating the wallet presentation at each app launch.
 */
const persistConfig: PersistConfig<PresentationState> = {
  key: "presentation",
  storage: AsyncStorage,
};

/**
 * Persisted reducer for the presentation slice.
 */
export const presentationReducer = persistReducer(
  persistConfig,
  presentationSlice.reducer
);

/**
 * Selects the presentation state from the root state.
 * @param state - The root state of the Redux store
 * @returns The presentation state as {@link AsyncStatus}
 */
export const selectPresentationAsyncStatus = (state: RootState) =>
  state.presentation.asyncStatus;
