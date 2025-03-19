import { createSlice } from "@reduxjs/toolkit";

import {
  remoteCrossDevicePresentationThunk as remoteCrossDevicePresentationThunk,
  type RequestObject,
} from "../../thunks/presentation";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  requestObject: RequestObject | undefined;
  requestedClaims: string[] | undefined;
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
    requestObject: undefined,
    requestedClaims: undefined,
    asyncStatus: { ...asyncStatusInitial },
  },
  refusalState: {
    redirectUri: undefined,
    requestObject: undefined,
    requestedClaims: undefined,
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
          action.payload.result.authResponse.redirect_uri;
        state[action.meta.arg.allowed].requestObject =
          action.payload.result.requestObject;
        state[action.meta.arg.allowed].requestedClaims =
          action.payload.result.requestedClaims;
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
export const selectPresentationAcceptanceState = (state: RootState) =>
  state.presentation.acceptanceState;

/**
 * Selects the presentation state from the root state.
 * @param state - The root state of the Redux store
 * @returns The presentation state as {@link AsyncStatus}
 */
export const selectPresentationRefusalState = (state: RootState) =>
  state.presentation.refusalState;
