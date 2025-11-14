import { createSlice } from "@reduxjs/toolkit";
import { asyncStatusInitial } from "../utils";
import type { AsyncStatus, RootState } from "../types";
import { sessionReset } from "./session";
import type { ParsedToken } from "../../../../src/trust/utils";
import { validateTrustChainThunk } from "../../thunks/trustValidation";

type TrustValidationState = {
  isValid: boolean | undefined;
  validatedChain: ParsedToken[] | undefined;
  validationError: string | undefined;
  asyncStatus: AsyncStatus;
};

const initialState: TrustValidationState = {
  isValid: undefined,
  validatedChain: undefined,
  validationError: undefined,
  asyncStatus: asyncStatusInitial,
};

const trustValidationSlice = createSlice({
  name: "trustValidation",
  initialState,
  reducers: {
    trustValidationReset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateTrustChainThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = { status: false, error: undefined };
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
          status: true,
          error: action.error,
        };
        state.isValid = false;
        state.validatedChain = undefined;
        state.validationError =
          action.error.message || "Unknown validation error";
      })
      .addCase(sessionReset, () => initialState);
  },
});

export const { trustValidationReset } = trustValidationSlice.actions;
export const trustValidationReducer = trustValidationSlice.reducer;
export const selectTrustValidationState = (state: RootState) =>
  state.trustValidation;
