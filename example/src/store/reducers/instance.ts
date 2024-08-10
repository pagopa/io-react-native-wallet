import { createSlice } from "@reduxjs/toolkit";

import { createWalletInstanceThunk } from "../../thunks/instance";
import { persistReducer, type PersistConfig } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { withAsyncStateInitial } from "../utilts";
import type { RootState, WithAsyncState } from "../types";

// State type definition for the session slice
type InstanceState = WithAsyncState & {
  keyTag: string | undefined;
};

// Initial state for the session slice
const initialState: InstanceState = {
  keyTag: undefined,
  ...withAsyncStateInitial,
};

/**
 * Redux slice for the session state. It contains the IO auth token.
 * Two actions are defined:
 * - sessionSet: sets the IO auth token
 * - sessionReset: resets the session state
 */
const instanceSlice = createSlice({
  name: "instance",
  initialState,
  reducers: {
    instanceReset: () => initialState,
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(createWalletInstanceThunk.fulfilled, (state, action) => {
      // Add user to the state array
      state.isDone = true;
      state.keyTag = action.payload;
      state.isLoading = initialState.isLoading;
      state.hasError = initialState.hasError;
    });
    builder.addCase(createWalletInstanceThunk.pending, (state) => {
      // Add user to the state array
      state.isDone = false;
      state.isLoading = true;
      state.hasError = initialState.hasError;
    });
    builder.addCase(createWalletInstanceThunk.rejected, (state, action) => {
      state.isDone = initialState.isDone;
      state.isLoading = initialState.isLoading;
      state.hasError = { status: true, error: action.error };
    });
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { instanceReset } = instanceSlice.actions;

const persistConfig: PersistConfig<InstanceState> = {
  key: "instance",
  storage: AsyncStorage,
  whitelist: ["keyTag"],
};

/**
 * Persisted reducer for the session slice.
 */
export const instanceReducer = persistReducer(
  persistConfig,
  instanceSlice.reducer
);

export const selectInstanceState = (state: RootState) => state.instance;

/**
 * Selects the IO auth token from the session state.
 * @param state - The root state of the Redux store
 * @returns The IO auth token
 */
export const selectInstanceKeyTag = (state: RootState) => state.instance.keyTag;

export const selectHasInstanceKeyTag = (state: RootState) =>
  selectInstanceKeyTag(state) !== undefined;
