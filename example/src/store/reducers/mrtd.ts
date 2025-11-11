import { createSlice } from "@reduxjs/toolkit";
import type { AsyncStatus, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import {
  initPidMrtdChallengeThunk,
  validatePidMrtdChallengeThunk,
} from "../../thunks/mrtd";

type MrtdFlowParams = {
  challenge: string;
  verifyUrl: string;
  mrtd_auth_session: string;
  mrtd_pop_nonce: string;
};

type MrtdValidationResult = {
  mrtd_val_pop_nonce: string;
  redirect_uri: string;
};

type MrtdState = {
  asyncStatus: AsyncStatus;
  flowParams?: MrtdFlowParams;
  validation?: MrtdValidationResult;
};

const initialState: MrtdState = {
  asyncStatus: asyncStatusInitial,
};

const mrtdSlice = createSlice({
  name: "mrtd",
  initialState,
  reducers: {
    mrtdReset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(initPidMrtdChallengeThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = { status: false, error: undefined };
      })
      .addCase(initPidMrtdChallengeThunk.fulfilled, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = true;
        state.flowParams = action.payload;
      })
      .addCase(initPidMrtdChallengeThunk.rejected, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = {
          status: true,
          error: action.error,
        };
        state.flowParams = undefined;
        state.validation = undefined;
      })
      .addCase(validatePidMrtdChallengeThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = { status: false, error: undefined };
      })
      .addCase(validatePidMrtdChallengeThunk.fulfilled, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = true;
        state.validation = action.payload;
      })
      .addCase(validatePidMrtdChallengeThunk.rejected, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = {
          status: true,
          error: action.error,
        };
        state.flowParams = undefined;
        state.validation = undefined;
      });
  },
});

export const { mrtdReset } = mrtdSlice.actions;

export const mrtdReducer = mrtdSlice.reducer;

export const selectMrtdAsyncStatus = (state: RootState) =>
  state.mrtd.asyncStatus;

export const selectMrtdFlowParams = (state: RootState) => state.mrtd.flowParams;

export const selectMrtdChallenge = (state: RootState) =>
  state.mrtd.flowParams?.challenge;
