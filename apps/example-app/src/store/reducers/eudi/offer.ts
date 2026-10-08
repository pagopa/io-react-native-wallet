import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { createSlice } from "@reduxjs/toolkit";

import type { AsyncStatus, RootState } from "../../types";

import { resolveEudiCredentialOfferThunk } from "../../../thunks/eudi/offer";
import { asyncStatusInitial } from "../../utils";

export interface EudiCredentialOfferState {
  asyncStatus: AsyncStatus;
  issuerMetadata?: Eudi.CredentialIssuance.CredentialIssuerMetadata;
  offer?: Eudi.CredentialOffer.CredentialOffer;
  /** The URI the offer was resolved from */
  uri?: string;
}

const initialState: EudiCredentialOfferState = {
  asyncStatus: asyncStatusInitial,
};

/**
 * Redux slice for the EUDI Wallet Credential Offer, separate from the IT-Wallet one.
 */
const eudiCredentialOfferSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(resolveEudiCredentialOfferThunk.fulfilled, (_, action) => ({
      asyncStatus: { ...asyncStatusInitial, isDone: true },
      ...action.payload,
    }));

    builder.addCase(resolveEudiCredentialOfferThunk.pending, (_, action) => ({
      asyncStatus: { ...asyncStatusInitial, isLoading: true },
      uri: action.meta.arg.uri,
    }));

    builder.addCase(resolveEudiCredentialOfferThunk.rejected, (_, action) => ({
      asyncStatus: {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      },
      uri: action.meta.arg.uri,
    }));
  },
  initialState,
  name: "eudiOffer",
  reducers: {
    eudiCredentialOfferReset: () => initialState,
  },
});

export const { eudiCredentialOfferReset } = eudiCredentialOfferSlice.actions;

export const eudiCredentialOfferReducer = eudiCredentialOfferSlice.reducer;

export const selectEudiCredentialOfferState = (state: RootState) =>
  state.eudiOffer;
