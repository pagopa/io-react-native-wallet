import { createSlice } from "@reduxjs/toolkit";
import { sessionReset } from "./sesssion";
import type { AsyncStatus, CredentialOfferResult, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import {
  getCredentialOfferFlowThunk,
  getCredentialOfferRequestedParams,
} from "../../thunks/offer";
import type {
  CredentialIssuerMetadata,
  CredentialOffer,
  GrantTypeSelection,
} from "../../../../src/credential/offer";

type CredentialOfferDetails = {
  offer: CredentialOffer;
  grant: GrantTypeSelection;
  issuerConf: CredentialIssuerMetadata;
};

/**
 * The Credential Offer slice state.
 * Tracks the asynchronous status and the result of a credential offer issuance.
 */
type CredentialOfferState = {
  result?: CredentialOfferResult;
  asyncStatus: AsyncStatus;
  details?: CredentialOfferDetails;
};

const initialState: CredentialOfferState = {
  result: undefined,
  asyncStatus: asyncStatusInitial,
  details: undefined,
};

/**
 * Redux slice handling the OpenID4VCI Credential Offer flow.
 */
const credentialOfferSlice = createSlice({
  name: "offer",
  initialState,
  reducers: {
    credentialOfferReset: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // === Fulfilled ===
      .addCase(getCredentialOfferFlowThunk.fulfilled, (state, action) => {
        state.asyncStatus.isDone = true;
        state.asyncStatus.isLoading = false;
        state.asyncStatus.hasError = initialState.asyncStatus.hasError;
        state.result = action.payload;
      })

      // === Pending ===
      .addCase(getCredentialOfferFlowThunk.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = initialState.asyncStatus.hasError;
        state.result = undefined;
      })

      // === Rejected ===
      .addCase(getCredentialOfferFlowThunk.rejected, (state, action) => {
        state.asyncStatus.isDone = false;
        state.asyncStatus.isLoading = false;
        state.asyncStatus.hasError = { status: true, error: action.error };
        state.result = undefined;
      })

      // === Fulfilled ===
      .addCase(getCredentialOfferRequestedParams.fulfilled, (state, action) => {
        state.asyncStatus.isDone = true;
        state.asyncStatus.isLoading = false;
        state.asyncStatus.hasError = initialState.asyncStatus.hasError;
        state.details = action.payload;
      })

      // === Pending ===
      .addCase(getCredentialOfferRequestedParams.pending, (state) => {
        state.asyncStatus.isLoading = true;
        state.asyncStatus.isDone = false;
        state.asyncStatus.hasError = initialState.asyncStatus.hasError;
        state.details = undefined;
        state.result = undefined;
      })

      // === Rejected ===
      .addCase(getCredentialOfferRequestedParams.rejected, (state, action) => {
        state.asyncStatus.isDone = true;
        state.asyncStatus.isLoading = false;
        state.asyncStatus.hasError = { status: true, error: action.error };
        state.details = undefined;
        state.result = undefined;
      })

      // === Reset on session reset ===
      .addCase(sessionReset, () => initialState);
  },
});

export const { credentialOfferReset } = credentialOfferSlice.actions;
export const credentialOfferReducer = credentialOfferSlice.reducer;

export const selectCredentialOfferState = (state: RootState) => state.offer;
export const selectCredentialOfferResult = (state: RootState) =>
  state.offer.result;
export const selectCredentialOfferStatus = (state: RootState) =>
  state.offer.asyncStatus;
export const selectCredentialOfferDetails = (state: RootState) =>
  state.offer.details;
