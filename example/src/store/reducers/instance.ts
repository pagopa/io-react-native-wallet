import { createSlice } from "@reduxjs/toolkit";
import { asyncStatusInitial } from "../utils";
import type { RootState, AsyncStatus } from "../types";
import { sessionReset } from "./sesssion";
import { persistReducer, type PersistConfig } from "redux-persist";
import { createWalletInstanceThunk } from "../../thunks/instance";
import AsyncStorage from "@react-native-async-storage/async-storage";

// State type definition for the attestion slice
type InstanceState = {
  keyTag: string | undefined;
  asyncStatus: AsyncStatus;
};

// Initial state for the attestation slice
const initialState: InstanceState = {
  keyTag: undefined,
  asyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the attestion state. It contains the obtained attestation.
 * Currently it is not persisted or reused since each operation requires a new attestation.
 */
export const instanceSlice = createSlice({
  name: "instance",
  initialState,
  reducers: {
    instanceReset: () => initialState, // Reset the attestation state
  },
  extraReducers: (builder) => {
    // Dispatched when a get attestion async thunk resolves. Sets the attestation and resets the state.
    builder.addCase(createWalletInstanceThunk.fulfilled, (state, action) => {
      state.asyncStatus.isDone = true;
      state.keyTag = action.payload;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a get attestion async thunk is pending. Sets the loading state to true and resets done and hasError.
    builder.addCase(createWalletInstanceThunk.pending, (state) => {
      // Sets the loading state and resets done and hasError;
      state.asyncStatus.isLoading = true;
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a get attestion async thunk rejects. Sets the attestation state to hasError and resets loading and isDone.
    builder.addCase(createWalletInstanceThunk.rejected, (state, action) => {
      // Sets the hasError state and resets done and loading.
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = { status: true, error: action.error };
    });

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the attestaion slice.
 */
export const { instanceReset } = instanceSlice.actions;

/**
 * Configuration for the instance slice to be persisted in the Redux store.
 * Only the keyTag is persisted to avoid regenerating the wallet instance at each app launch.
 */
const persistConfig: PersistConfig<InstanceState> = {
  key: "instance",
  storage: AsyncStorage,
  whitelist: ["keyTag"],
};

/**
 * Persisted reducer for the instance slice.
 */
export const instanceReducer = persistReducer(
  persistConfig,
  instanceSlice.reducer
);

/**
 * Selects the instance state from the root state.
 * @param state - The root state of the Redux store
 * @returns The instance state as {@link AsyncStatus}
 */
export const selectInstanceAsyncStatus = (state: RootState) =>
  state.instance.asyncStatus;

/**
 * Selects the key tag used to register the wallet instance.
 * @param state - The root state of the Redux store
 * @returns the key tag used to register the wallet instance
 */
export const selectInstanceKeyTag = (state: RootState) => state.instance.keyTag;

/**
 * Returns true if the key tag is defined, thus a wallet instance exists, false otherwise.
 * @param state - The root state of the Redux store
 * @returns true if the key tag is defined, false otherwise
 */
export const selectHasInstanceKeyTag = (state: RootState) =>
  selectInstanceKeyTag(state) !== undefined;
