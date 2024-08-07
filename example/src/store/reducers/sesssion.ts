import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, type PersistConfig } from "redux-persist";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// State type definition for the session slice
type SessionState = { ioAuthToken: string | undefined };

// Initial state for the session slice
const initialState: SessionState = { ioAuthToken: undefined };

/**
 * Redux slice for the session state. It contains the IO auth token.
 * Two actions are defined:
 * - sessionSet: sets the IO auth token
 * - sessionReset: resets the session state
 */
export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    sessionSet: (state, action: PayloadAction<string>) => {
      state.ioAuthToken = action.payload;
    },
    sessionReset: () => initialState,
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { sessionSet, sessionReset } = sessionSlice.actions;

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
  sessionSlice.reducer
);

/**
 * Selects the IO auth token from the session state.
 * @param state - The root state of the Redux store
 * @returns The IO auth token
 */
export const selectIoAuthToken = (state: RootState) =>
  state.session.ioAuthToken;
