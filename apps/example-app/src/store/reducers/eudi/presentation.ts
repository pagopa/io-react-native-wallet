import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { createSlice } from "@reduxjs/toolkit";

import type { AsyncStatus, RootState } from "../../types";

import {
  completeEudiPresentationThunk,
  startEudiPresentationThunk,
  type StartEudiPresentationThunkOutput,
} from "../../../thunks/eudi/presentation";
import { asyncStatusInitial } from "../../utils";

export interface EudiPresentationState {
  /** Status of the response sent to the Verifier */
  completionStatus: AsyncStatus;
  /** The verified request with the credentials that satisfy it */
  request?: StartEudiPresentationThunkOutput;
  /** The Verifier response, available once the presentation is completed */
  response?: Eudi.RemotePresentation.AuthorizationResponseResult;
  /** Status of the request verification */
  startStatus: AsyncStatus;
  /** The URI the request was resolved from */
  uri?: string;
}

const initialState: EudiPresentationState = {
  completionStatus: asyncStatusInitial,
  startStatus: asyncStatusInitial,
};

/**
 * Redux slice for the EUDI Wallet remote presentation, separate from the IT-Wallet one.
 */
const eudiPresentationSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(startEudiPresentationThunk.pending, (_, action) => ({
      ...initialState,
      startStatus: { ...asyncStatusInitial, isLoading: true },
      uri: action.meta.arg.uri,
    }));

    builder.addCase(startEudiPresentationThunk.fulfilled, (_, action) => ({
      ...initialState,
      request: action.payload,
      startStatus: { ...asyncStatusInitial, isDone: true },
      uri: action.payload.uri,
    }));

    builder.addCase(startEudiPresentationThunk.rejected, (_, action) => ({
      ...initialState,
      startStatus: {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      },
      uri: action.meta.arg.uri,
    }));

    builder.addCase(completeEudiPresentationThunk.pending, (state) => {
      state.completionStatus = { ...asyncStatusInitial, isLoading: true };
    });

    builder.addCase(
      completeEudiPresentationThunk.fulfilled,
      (state, action) => {
        state.completionStatus = { ...asyncStatusInitial, isDone: true };
        state.response = action.payload;
      },
    );

    builder.addCase(completeEudiPresentationThunk.rejected, (state, action) => {
      state.completionStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });
  },
  initialState,
  name: "eudiPresentation",
  reducers: {
    eudiPresentationReset: () => initialState,
  },
});

export const { eudiPresentationReset } = eudiPresentationSlice.actions;

export const eudiPresentationReducer = eudiPresentationSlice.reducer;

export const selectEudiPresentationState = (state: RootState) =>
  state.eudiPresentation;

export const selectEudiPresentationRequest = (state: RootState) =>
  state.eudiPresentation.request;
