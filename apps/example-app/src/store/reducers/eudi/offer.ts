import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { createSlice } from "@reduxjs/toolkit";

import type { AsyncStatus, RootState } from "../../types";

import { resolveEudiCredentialOfferThunk } from "../../../thunks/eudi/offer";
import { asyncStatusInitial } from "../../utils";

export interface EudiCredentialOfferState {
  asyncStatus: AsyncStatus;
  offer?: Eudi.CredentialOffer.CredentialOffer;
}

const initialState: EudiCredentialOfferState = {
  asyncStatus: asyncStatusInitial,
  offer: undefined,
};

/**
 * Redux slice for the EUDI Wallet Credential Offer, separate from the IT-Wallet one.
 */
const eudiCredentialOfferSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(resolveEudiCredentialOfferThunk.fulfilled, (_, action) => ({
      asyncStatus: { ...asyncStatusInitial, isDone: true },
      offer: action.payload,
    }));

    builder.addCase(resolveEudiCredentialOfferThunk.pending, () => ({
      asyncStatus: { ...asyncStatusInitial, isLoading: true },
      offer: undefined,
    }));

    builder.addCase(resolveEudiCredentialOfferThunk.rejected, (_, action) => ({
      asyncStatus: {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      },
      offer: undefined,
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
