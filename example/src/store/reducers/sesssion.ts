import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistReducer, type PersistConfig } from "redux-persist";
import { createSlice } from "@reduxjs/toolkit";
import type { RootState } from "../types";
import uuid from "react-native-uuid";

/* State type definition for the session slice
 * essionId - Randomly generated session id which identifies a wallet when creating a wallet instance. It gets resetted when the onboarding
 */
type SessionState = { sessionId: string };

// Initial state for the session slice
const initialState: SessionState = { sessionId: uuid.v4().toString() };

/**
 * Redux slice for the session state. It contains the IO auth token.
 */
export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    // Resets the session state when logging out
    sessionReset: () => initialState,
  },
});

/**
 * Exports the actions for the session slice.
 */
export const { sessionReset } = sessionSlice.actions;

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
export const selectSesssionId = (state: RootState) => state.session.sessionId;
