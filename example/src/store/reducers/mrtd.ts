import { createSlice } from "@reduxjs/toolkit";

import type { AsyncStatus, RootState } from "../types";

import {
  type InitPidMrtdChallengeOutput,
  initPidMrtdChallengeThunk,
  validatePidMrtdChallengeThunk,
  type VerifyPidMrtdChallengeOutput,
} from "../../thunks/mrtd";
import { asyncStatusInitial } from "../utils";

interface MrtdState {
  asyncStatus: AsyncStatus;
  flowParams?: InitPidMrtdChallengeOutput;
  validation?: VerifyPidMrtdChallengeOutput;
}

const initialState: MrtdState = {
  asyncStatus: asyncStatusInitial,
};

const mrtdSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(initPidMrtdChallengeThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = { error: undefined, status: false };
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
          error: action.error,
          status: true,
        };
        state.flowParams = undefined;
        state.validation = undefined;
      })
      .addCase(validatePidMrtdChallengeThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = { error: undefined, status: false };
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
          error: action.error,
          status: true,
        };
        state.flowParams = undefined;
        state.validation = undefined;
      });
  },
  initialState,
  name: "mrtd",
  reducers: {
    mrtdReset: () => initialState,
  },
});

export const { mrtdReset } = mrtdSlice.actions;

export const mrtdReducer = mrtdSlice.reducer;

export const selectMrtdAsyncStatus = (state: RootState) =>
  state.mrtd.asyncStatus;

export const selectMrtdFlowParams = (state: RootState) => state.mrtd.flowParams;

export const selectMrtdChallenge = (state: RootState) =>
  state.mrtd.flowParams?.challenge;

export const selectMrtdChallengeCallbackUrl = (state: RootState) =>
  state.mrtd.validation?.callbackUrl;
