import { type ItwVersion } from "@pagopa/io-react-native-wallet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { EnvType, RootState } from "../types";

// State type definition for the environment slice
interface EnvironmentState {
  env: EnvType;
  itwVersion: ItwVersion;
  loggingAddress?: string;
}

// Initial state for the environment slice
const initialState: EnvironmentState = {
  env: "prod",
  itwVersion: "1.0.0",
  loggingAddress: undefined,
};

/**
 * Redux slice for the environment state. It contains the selected environment which can be either "prod" or "pre".
 */
export const environmentSlice = createSlice({
  initialState,
  name: "environment",
  reducers: {
    // Resets the session state when logging out
    envReset: (state) => {
      state.env = initialState.env;
    },
    // Sets the IO auth token
    envSet: (state, action: PayloadAction<EnvType>) => {
      state.env = action.payload;
    },
    // Sets the debug logging address
    loggingAddressSet: (state, action: PayloadAction<string>) => {
      state.loggingAddress = action.payload;
    },
    setItwVersion: (state, action: PayloadAction<ItwVersion>) => {
      state.itwVersion = action.payload;
    },
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { envReset, envSet, loggingAddressSet, setItwVersion } =
  environmentSlice.actions;

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

/**
 * Selects the environment from the state.
 * @param state - The state to select the environment from
 * @returns the selected environment
 */
export const selectEnv = (state: RootState) => state.environment.env;

export const selectLoggingAddress = (state: RootState) =>
  state.environment.loggingAddress;

export const selectItwVersion = (state: RootState) =>
  state.environment.itwVersion;
