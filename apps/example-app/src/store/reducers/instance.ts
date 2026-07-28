import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus } from "../types";

import {
  createWalletInstanceThunk,
  revokeWalletInstanceThunk,
} from "../../thunks/instance";
import { instanceReset } from "../instance";
import { asyncStatusInitial } from "../utils";
import { sessionReset } from "./session";

export {
  instanceReset,
  selectHasInstanceKeyTag,
  selectInstanceAsyncStatus,
  selectInstanceKeyTag,
  selectInstanceRevocationAsyncStatus,
} from "../instance";

/**
 * State type definition for the wallet instance slice
 * the state contains:
 * - keyTag: the key tag used to register  the wallet instance
 * - async state: isLoading, isDone, hasError as defined in {@link AsyncStatus}
 */
export interface InstanceState {
  asyncStatus: AsyncStatus;
  keyTag: string | undefined;
  revocationAsyncStatus: AsyncStatus;
}

// Initial state for the instance slice
const initialState: InstanceState = {
  asyncStatus: asyncStatusInitial,
  keyTag: undefined,
  revocationAsyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the instance state which contains the key tag used to register the wallet instance.
 */
const instanceSlice = createSlice({
  extraReducers: (builder) => {
    // Dispatched when a wallet istance is created. Sets the key tag in the state and its state to isDone while resetting isLoading and hasError.
    builder.addCase(createWalletInstanceThunk.fulfilled, (state, action) => {
      state.asyncStatus.isDone = true;
      state.keyTag = action.payload;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a wallet istance is revoked. Removes the key tag.
    builder.addCase(revokeWalletInstanceThunk.fulfilled, (state) => {
      state.revocationAsyncStatus.isDone = true;
      state.revocationAsyncStatus.isLoading = false;
      state.revocationAsyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a wallet istance is pending. Sets the state to isLoading and resets isDone and hasError.
    builder.addCase(createWalletInstanceThunk.pending, (state) => {
      state.asyncStatus.isDone = false;
      state.asyncStatus.isLoading = true;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a wallet istance is being revoked.
    builder.addCase(revokeWalletInstanceThunk.pending, (state) => {
      state.revocationAsyncStatus.isDone = false;
      state.revocationAsyncStatus.isLoading = true;
      state.revocationAsyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when a wallet istance is rejected. Sets the state to hasError and resets isLoading and isDone.
    builder.addCase(createWalletInstanceThunk.rejected, (state, action) => {
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = { error: action.error, status: true };
    });

    // Dispatched when a wallet istance revocation request is rejected.
    builder.addCase(revokeWalletInstanceThunk.rejected, (state, action) => {
      state.revocationAsyncStatus.isDone = false;
      state.revocationAsyncStatus.isLoading = false;
      state.revocationAsyncStatus.hasError = {
        error: action.error,
        status: true,
      };
    });

    builder.addCase(instanceReset, () => initialState);

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
  initialState,
  name: "instance",
  reducers: {},
});

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
  instanceSlice.reducer,
);
