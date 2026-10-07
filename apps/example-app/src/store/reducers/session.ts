import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { RootState } from "../types";

// Method used to login to IO
export type LoginMethod = "cie" | "spid";

// State type definition for the session slice
export interface SessionState {
  ioAuthToken: string | undefined;
  // Whether the user chose to use the app without logging in to IO
  isLoginSkipped: boolean;
  // Undefined for sessions persisted before the CIE login was available, which were always SPID
  loginMethod?: LoginMethod;
}

// Initial state for the session slice
const initialState: SessionState = {
  ioAuthToken: undefined,
  isLoginSkipped: false,
};

/**
 * Redux slice for the session state. It contains the IO auth token.
 */
export const sessionSlice = createSlice({
  initialState,
  name: "session",
  reducers: {
    // Resets the session state when logging out
    sessionReset: () => initialState,
    // Sets the IO auth token and the method used to obtain it
    sessionSet: (
      state,
      action: PayloadAction<{ loginMethod: LoginMethod; token: string }>,
    ) => {
      state.ioAuthToken = action.payload.token;
      state.loginMethod = action.payload.loginMethod;
    },
    // Skips the IO login
    sessionSkip: (state) => {
      state.isLoginSkipped = true;
    },
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { sessionReset, sessionSet, sessionSkip } = sessionSlice.actions;

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

/**
 * Selects whether the user can access the app, either because logged in to IO or because the login was skipped.
 * @param state - The root state of the Redux store
 * @returns true if the user can access the app
 */
export const selectHasSessionAccess = (state: RootState) =>
  !!state.session.ioAuthToken || state.session.isLoginSkipped;

/**
 * Selects how the user accessed the app.
 * @param state - The root state of the Redux store
 * @returns the login method, or `undefined` if not logged in
 */
export const selectLoginMethod = (state: RootState): LoginMethod | undefined =>
  state.session.ioAuthToken ? (state.session.loginMethod ?? "spid") : undefined;
