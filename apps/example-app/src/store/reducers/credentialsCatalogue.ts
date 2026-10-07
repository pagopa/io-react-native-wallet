import type { CredentialsCatalogue } from "@io-app-it-wallet/io-react-native-wallet";

import { createSlice } from "@reduxjs/toolkit";

import type { AsyncStatus } from "../types";

import {
  getCredentialsCatalogueThunk,
  getCredentialsCatalogueTranslationsThunk,
} from "../../thunks/credentialsCatalogue";
import { asyncStatusInitial } from "../utils";

export {
  selectCredentialsCatalogue,
  selectCredentialsCatalogueAsyncStatus,
  selectCredentialsCatalogueTranslations,
  selectCredentialsCatalogueTranslationsAsyncStatus,
} from "../selectors/credentialsCatalogue";

export interface CredentialsCatalogueState {
  asyncStatus: AsyncStatus;
  catalogue: CredentialsCatalogue.DigitalCredentialsCatalogue | undefined;
  translations: CredentialsCatalogue.CatalogueTranslations | undefined;
  translationsAsyncStatus: AsyncStatus;
}

const initialState: CredentialsCatalogueState = {
  asyncStatus: asyncStatusInitial,
  catalogue: undefined,
  translations: undefined,
  translationsAsyncStatus: asyncStatusInitial,
};

export const credentialsCatalogueSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(getCredentialsCatalogueThunk.fulfilled, (state, action) => {
      state.catalogue = action.payload;
      state.asyncStatus.isDone = true;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    builder.addCase(getCredentialsCatalogueThunk.pending, (state) => {
      state.asyncStatus.isLoading = true;
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.hasError = initialState.asyncStatus.hasError;
    });

    builder.addCase(getCredentialsCatalogueThunk.rejected, (state, action) => {
      state.catalogue = initialState.catalogue;
      state.asyncStatus.isDone = initialState.asyncStatus.isDone;
      state.asyncStatus.isLoading = initialState.asyncStatus.isLoading;
      state.asyncStatus.hasError = { error: action.error, status: true };
    });

    builder.addCase(
      getCredentialsCatalogueTranslationsThunk.fulfilled,
      (state, action) => {
        state.translations = action.payload;
        state.translationsAsyncStatus.isDone = true;
        state.translationsAsyncStatus.isLoading =
          initialState.translationsAsyncStatus.isLoading;
        state.translationsAsyncStatus.hasError =
          initialState.translationsAsyncStatus.hasError;
      },
    );

    builder.addCase(
      getCredentialsCatalogueTranslationsThunk.pending,
      (state) => {
        state.translationsAsyncStatus.isLoading = true;
        state.translationsAsyncStatus.isDone =
          initialState.translationsAsyncStatus.isDone;
        state.translationsAsyncStatus.hasError =
          initialState.translationsAsyncStatus.hasError;
      },
    );

    builder.addCase(
      getCredentialsCatalogueTranslationsThunk.rejected,
      (state, action) => {
        state.translations = initialState.translations;
        state.translationsAsyncStatus.isDone =
          initialState.translationsAsyncStatus.isDone;
        state.translationsAsyncStatus.isLoading =
          initialState.translationsAsyncStatus.isLoading;
        state.translationsAsyncStatus.hasError = {
          error: action.error,
          status: true,
        };
      },
    );
  },
  initialState,
  name: "credentialsCatalogue",
  reducers: {},
});
