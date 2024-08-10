import { createSlice } from "@reduxjs/toolkit";

import { createWalletInstanceThunk } from "../../thunks/instance";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { asyncStatusInitial } from "../utilts";
import type { RootState, AsyncStatus } from "../types";

/**
 * State type definition for the wallet instance slice
 * the state contains:
 * - keyTag: the key tag used to register  the wallet instance
 * - async state: isLoading, isDone, hasError as defined in {@link AsyncStatus}
 */
type InstanceState = {
  asyncStatus: AsyncStatus;
  keyTag: string | undefined;
};

// Initial state for the instance slice
const initialState: InstanceState = {
  keyTag: undefined,
  asyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the instance state which contains the key tag used to register the wallet instance.
 */
const instanceSlice = createSlice({
  name: "instance",
  initialState,
  reducers: {
    instanceReset: () => initialState,
  },
  extraReducers: (builder) => {
    // Dispatched when a wallet istance is created. Sets the key tag in the state and its state to isDone while resetting isLoading and hasError.
    builder.addCase(createWalletInstanceThunk.fulfilled, (state, action) => {
      state.asyncStatus.isDone = true;
      state.keyTag = action.payload;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a wallet istance is pending. Sets the state to isLoading and resets isDone and hasError.
    builder.addCase(createWalletInstanceThunk.pending, (state) => {
      state.asyncStatus.isDone = false;
      state.asyncStatus.isLoading = true;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a wallet istance is rejected. Sets the state to hasError and resets isLoading and isDone.
    builder.addCase(createWalletInstanceThunk.rejected, (state, action) => {
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = { status: true, error: action.error };
    });
  },
});

/**
 * Exports the actions for the instance slice.
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
