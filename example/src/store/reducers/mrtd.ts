import { createSlice } from "@reduxjs/toolkit";
import type { AsyncStatus, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import { initPidMrtdChallengeThunk } from "../../thunks/mrtd";

type MrtdState = {
  asyncStatus: AsyncStatus;
  challengeData: {
    challenge?: string;
    mrtd_auth_session?: string;
    mrtd_pop_nonce?: string;
    mrtd_val_pop_nonce?: string;
    redirect_uri?: string;
  };
};

const initialState: MrtdState = {
  asyncStatus: asyncStatusInitial,
  challengeData: {},
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
        state.challengeData.challenge = action.payload.challenge;
        state.challengeData.mrtd_auth_session =
          action.payload.mrtd_auth_session;
        state.challengeData.mrtd_pop_nonce = action.payload.mrtd_pop_nonce;
      })
      .addCase(initPidMrtdChallengeThunk.rejected, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = {
          status: true,
          error: action.error,
        };
      });
  },
});

export const { mrtdReset } = mrtdSlice.actions;

export const mrtdReducer = mrtdSlice.reducer;

export const selectMrtdAsyncStatus = () => (state: RootState) =>
  state.mrtd.asyncStatus;

export const selectMrtdChallengeData = () => (state: RootState) =>
  state.mrtd.challengeData;
