import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, RootState } from "../types";

import {
  remoteCrossDevicePresentationThunk as remoteCrossDevicePresentationThunk,
  type RequestObject,
} from "../../thunks/presentation";
import { asyncStatusInitial } from "../utils";
import { sessionReset } from "./session";

/**
 * exporting a keytype of {@link PresentationState}
 */
export type PresentationStateKeys = keyof PresentationState;

/**
 * State type definition for the presentation slice
 * the state contains :
 * - acceptanceState : {@link SinglePresentationState}
 * - refusalState : {@link SinglePresentationState}
 */
interface PresentationState {
  acceptanceState: SinglePresentationState;
  refusalState: SinglePresentationState;
}

/**
 * State type definition for a single presentaion scenario
 * the state contains:
 * - async state: isLoading, isDone, hasError as defined in {@link AsyncStatus}
 */
interface SinglePresentationState {
  asyncStatus: AsyncStatus;
  redirectUri: string | undefined;
  requestedClaims: string[] | undefined;
  requestObject: RequestObject | undefined;
}

// Initial state for the presentation slice
const initialState: PresentationState = {
  acceptanceState: {
    asyncStatus: { ...asyncStatusInitial },
    redirectUri: undefined,
    requestedClaims: undefined,
    requestObject: undefined,
  },
  refusalState: {
    asyncStatus: { ...asyncStatusInitial },
    redirectUri: undefined,
    requestedClaims: undefined,
    requestObject: undefined,
  },
};

/**
 * Redux slice for the presentation state which contains the key tag used to register the wallet presentation.
 */
const presentationSlice = createSlice({
  extraReducers: (builder) => {
    // Dispatched when is created. Sets the key tag in the state and its state to isDone while resetting isLoading and hasError.
    builder.addCase(
      remoteCrossDevicePresentationThunk.fulfilled,
      (state, action) => {
        state[action.meta.arg.allowed].redirectUri =
          action.payload.authResponse.redirect_uri;
        state[action.meta.arg.allowed].requestObject =
          action.payload.requestObject;
        state[action.meta.arg.allowed].requestedClaims =
          action.payload.requestedClaims;
        state[action.meta.arg.allowed].asyncStatus.isDone = true;
        state[action.meta.arg.allowed].asyncStatus.isLoading =
          initialState[action.meta.arg.allowed].asyncStatus.isLoading;
        state[action.meta.arg.allowed].asyncStatus.hasError =
          initialState[action.meta.arg.allowed].asyncStatus.hasError;
      },
    );

    // Dispatched when is pending. Sets the state to isLoading and resets isDone and hasError.
    builder.addCase(
      remoteCrossDevicePresentationThunk.pending,
      (state, action) => {
        state[action.meta.arg.allowed].asyncStatus.isDone = false;
        state[action.meta.arg.allowed].asyncStatus.isLoading = true;
        state[action.meta.arg.allowed].asyncStatus.hasError =
          initialState[action.meta.arg.allowed].asyncStatus.hasError;
      },
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
          error: action.error,
          status: true,
        };
      },
    );

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
  initialState,
  name: "presentation",
  reducers: {
    presentationReset: () => initialState,
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
  presentationSlice.reducer,
);

/**
 * Selects the presentation state from the root state.
 * @param state - The root state of the Redux store
 * @returns The presentation state as {@link AsyncStatus}
 */
export const selectPresentationAcceptanceState = (state: RootState) =>
  state.presentation.acceptanceState;

/**
 * Selects the presentation state from the root state.
 * @param state - The root state of the Redux store
 * @returns The presentation state as {@link AsyncStatus}
 */
export const selectPresentationRefusalState = (state: RootState) =>
  state.presentation.refusalState;
