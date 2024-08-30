import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, type PersistConfig } from "redux-persist";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../types";
import type { EnvType } from "../../utils/environment";

// State type definition for the session slice
type EnvironmentState = { env: EnvType };

export type EnvVariables = typeof import("@env");

// Initial state for the session slice
const initialState: EnvironmentState = { env: "prod" };

/**
 * Redux slice for the session state. It contains the IO auth token.
 */
export const environmentSlice = createSlice({
  name: "environment",
  initialState,
  reducers: {
    // Sets the IO auth token
    envSet: (state, action: PayloadAction<EnvType>) => {
      state.env = action.payload;
    },
    // Resets the session state when logging out
    envReset: () => initialState,
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { envSet, envReset } = environmentSlice.actions;

/**
 * Redux persist configuration for the session slice.
 * Currently it uses AsyncStorage as the storage engine which stores it in clear.
 */
const persistConfig: PersistConfig<EnvironmentState> = {
  key: "environment",
  storage: AsyncStorage,
};

/**
 * Persisted reducer for the session slice.
 */
export const environmentReducer = persistReducer(
  persistConfig,
  environmentSlice.reducer
);

export const selectEnv = (state: RootState) => state.environment.env;
