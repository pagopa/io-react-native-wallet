import { createSlice } from "@reduxjs/toolkit";

import { getCredentialOfferThunk } from "../../thunks/offer";
import { sessionReset } from "./sesssion";
import type { AsyncStatus, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import type { Credential } from "@pagopa/io-react-native-wallet";

type CredentialOfferState = {
  offer?: Credential.Offer.CredentialOffer;
  asyncStatus: AsyncStatus;
};

const initialState: CredentialOfferState = {
  offer: undefined,
  asyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the presentation state which contains the key tag used to register the wallet presentation.
 */
const credentialOfferSlice = createSlice({
  name: "offer",
  initialState,
  reducers: {
    credentialOfferReset: () => initialState,
  },
  extraReducers: (builder) => {
    // Dispatched when is created. Sets the key tag in the state and its state to isDone while resetting isLoading and hasError.
    builder.addCase(getCredentialOfferThunk.fulfilled, (state, action) => {
      state.asyncStatus.isDone = true;
      state.offer = action.payload;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when is pending. Sets the state to isLoading and resets isDone and hasError.
    builder.addCase(getCredentialOfferThunk.pending, (state) => {
      state.asyncStatus.isLoading = true;
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    // Dispatched when is rejected. Sets the state to hasError and resets isLoading and isDone.
    builder.addCase(getCredentialOfferThunk.rejected, (state, action) => {
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = { status: true, error: action.error };
    });

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the presentation slice.
 */
export const { credentialOfferReset } = credentialOfferSlice.actions;

export const credentialOfferReducer = credentialOfferSlice.reducer;

export const selectCredentialOfferState = (state: RootState) => state.offer;
