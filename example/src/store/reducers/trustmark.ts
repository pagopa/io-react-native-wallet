import { createSlice } from "@reduxjs/toolkit";
import type { AsyncStatus, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import { getTrustmarkThunk } from "../../thunks/trustmark";

/**
 * State type definition for the trustmark slice.
 * It contains:
 * - trustmarkJwt: the obtained trustmark signed JWT
 * - asyncStatus: the state of the async operation to get the trustmark
 */
type TrustmarkState = {
  trustmarkJwt: string | undefined;
  asyncStatus: AsyncStatus;
};

// Initial state for the trustmark slice
const initialState: TrustmarkState = {
  trustmarkJwt: undefined,
  asyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the trustmark state. It contains the trusmark and the trustmark async operation state
 */
const trustmarkSlice = createSlice({
  name: "trustmark",
  initialState,
  reducers: {
    trustmarkReset: () => initialState,
  },
  extraReducers: (builder) => {
    /*
     * Dispatched when a get trustmark async thunk resolves.
     * Sets the obtained trustmark and the state to isDone.
     */
    builder.addCase(getTrustmarkThunk.fulfilled, (state, action) => {
      state.asyncStatus.isDone = true;
      state.trustmarkJwt = action.payload.trustmarkJwt;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    /*
     * Dispatched when a get trustmark async thunk is pending.
     * Sets the trustmark state to isLoading while resetting isDone and hasError.
     */
    builder.addCase(getTrustmarkThunk.pending, (state) => {
      state.trustmarkJwt = undefined;
      state.asyncStatus = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /*
     * Dispatched when a get trustmark async thunk rejected.
     * Sets the trustmark state to hasError while resetting isLoading and hasError.
     */
    builder.addCase(getTrustmarkThunk.rejected, (state, action) => {
      state.asyncStatus = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });
  },
});

/**
 * Exports the actions for the trustmark slice.
 */
export const { trustmarkReset } = trustmarkSlice.actions;

/**
 * Reducer for the trustmark slice
 */
export const trustmarkReducer = trustmarkSlice.reducer;

/**
 * Selects the trustmark signed JWT from the trustmark state.
 * @returns the trustmark signed JWT
 */
export const selectTrustmarkJwt = (state: RootState) =>
  state.trustmark.trustmarkJwt;

/**
 * Selects the state of the async operation of the trustmark.
 * @returns the state of the async operation for the trustmark as {@link AsyncStatus}
 */
export const selectTrustmarkAsyncStatus = (state: RootState) =>
  state.trustmark.asyncStatus;
