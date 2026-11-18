import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { RootState } from "../types";

// State type definition for the environment slice
export interface EnvironmentState {
  loggingAddress?: string;
}

// Initial state for the environment slice
const initialState: EnvironmentState = {
  loggingAddress: undefined,
};

/**
 * Redux slice for the environment state. It contains the IT-Wallet version and the debug logging address.
 */
export const environmentSlice = createSlice({
  initialState,
  name: "environment",
  reducers: {
    // Sets the debug logging address
    loggingAddressSet: (state, action: PayloadAction<string>) => {
      state.loggingAddress = action.payload;
    },
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { loggingAddressSet } = environmentSlice.actions;

/**
 * Redux persist configuration for the environment slice.
 * Currently it uses AsyncStorage as the storage engine which stores it in clear.
 */
const persistConfig: PersistConfig<EnvironmentState> = {
  key: "environment",
  storage: AsyncStorage,
};

/**
 * Persisted reducer for the environment slice.
 */
export const environmentReducer = persistReducer(
  persistConfig,
  environmentSlice.reducer,
);

export const selectLoggingAddress = (state: RootState) =>
  state.environment.loggingAddress;
