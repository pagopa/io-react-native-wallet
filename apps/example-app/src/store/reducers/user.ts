import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";
import { v4 as uuidv4 } from "uuid";

import type { RootState } from "../types";

import { instanceReset } from "../instance";
import { sessionReset } from "./session";

/**
 * State type definition for the user slice
 * the state contains:
 * - xUserId: the UUIDv4 which identifies the user and is sent as `x-user-id` to the Wallet Provider
 */
export interface UserState {
  xUserId: string;
}

// Lazily generates a new x-user-id so that every reset yields a fresh one
const getInitialState = (): UserState => ({ xUserId: uuidv4() });

/**
 * Redux slice for the user state.
 * The x-user-id is generated at app startup and replaced by the persisted one on rehydration,
 * so it changes only when the whole wallet is reset.
 */
const userSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(instanceReset, getInitialState);
    builder.addCase(sessionReset, getInitialState);
  },
  initialState: getInitialState,
  name: "user",
  reducers: {},
});

/**
 * Redux persist configuration for the user slice.
 */
const persistConfig: PersistConfig<UserState> = {
  key: "user",
  storage: AsyncStorage,
};

/**
 * Persisted reducer for the user slice.
 */
export const userReducer = persistReducer(persistConfig, userSlice.reducer);

/**
 * Selects the user id sent as `x-user-id` to the Wallet Provider.
 * @param state - The root state of the Redux store
 * @returns The x-user-id
 */
export const selectXUserId = (state: RootState) => state.user.xUserId;
