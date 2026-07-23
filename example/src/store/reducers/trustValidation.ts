import type { Trust } from "@pagopa/io-react-native-wallet";

import { createSlice } from "@reduxjs/toolkit";

import type { AsyncStatus, RootState } from "../types";

import { validateTrustChainThunk } from "../../thunks/trustValidation";
import { asyncStatusInitial } from "../utils";
import { sessionReset } from "./session";

interface TrustValidationState {
  asyncStatus: AsyncStatus;
  isValid: boolean | undefined;
  validatedChain: undefined | ValidatedChain;
  validationError: string | undefined;
}

type ValidatedChain = Awaited<ReturnType<Trust.TrustApi["verifyTrustChain"]>>;

const initialState: TrustValidationState = {
  asyncStatus: asyncStatusInitial,
  isValid: undefined,
  validatedChain: undefined,
  validationError: undefined,
};

const trustValidationSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(validateTrustChainThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = { error: undefined, status: false };
        state.isValid = undefined;
        state.validatedChain = undefined;
        state.validationError = undefined;
      })
      .addCase(validateTrustChainThunk.fulfilled, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = true;
        state.isValid = true;
        state.validatedChain = action.payload.validatedChain;
        state.validationError = undefined;
      })
      .addCase(validateTrustChainThunk.rejected, (state, action) => {
        state.asyncStatus.isLoading = false;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = {
          error: action.error,
          status: true,
        };
        state.isValid = false;
        state.validatedChain = undefined;
        state.validationError =
          action.error.message || "Unknown validation error";
      })
      .addCase(sessionReset, () => initialState);
  },
  initialState,
  name: "trustValidation",
  reducers: {
    trustValidationReset: () => initialState,
  },
});

export const { trustValidationReset } = trustValidationSlice.actions;
export const trustValidationReducer = trustValidationSlice.reducer;
export const selectTrustValidationState = (state: RootState) =>
  state.trustValidation;
