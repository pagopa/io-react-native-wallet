import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, type PersistConfig } from "redux-persist";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { EnvType, RootState } from "../types";
// State type definition for the environment slice
type EnvironmentState = { env: EnvType };

// Initial state for the environment slice
const initialState: EnvironmentState = { env: "prod" };

/**
 * Redux slice for the environment state. It contains the selected environment which can be either "prod" or "pre".
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
  environmentSlice.reducer
);

/**
 * Selects the environment from the state.
 * @param state - The state to select the environment from
 * @returns the selected environment
 */
export const selectEnv = (state: RootState) => state.environment.env;
