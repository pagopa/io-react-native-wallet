import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { RootState } from "../types";

// State type definition for the session slice
interface SessionState {
  ioAuthToken: string | undefined;
}

// Initial state for the session slice
const initialState: SessionState = { ioAuthToken: undefined };

/**
 * Redux slice for the session state. It contains the IO auth token.
 */
export const sessionSlice = createSlice({
  initialState,
  name: "session",
  reducers: {
    // Resets the session state when logging out
    sessionReset: () => initialState,
    // Sets the IO auth token
    sessionSet: (state, action: PayloadAction<string>) => {
      state.ioAuthToken = action.payload;
    },
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { sessionReset, sessionSet } = sessionSlice.actions;

/**
 * Redux persist configuration for the session slice.
 * Currently it uses AsyncStorage as the storage engine which stores it in clear.
 */
const persistConfig: PersistConfig<SessionState> = {
  key: "session",
  storage: AsyncStorage,
};

/**
 * Persisted reducer for the session slice.
 */
export const sessionReducer = persistReducer(
  persistConfig,
  sessionSlice.reducer,
);

/**
 * Selects the IO auth token from the session state.
 * @param state - The root state of the Redux store
 * @returns The IO auth token
 */
export const selectIoAuthToken = (state: RootState) =>
  state.session.ioAuthToken;
