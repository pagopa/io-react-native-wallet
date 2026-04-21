import type { CredentialsCatalogue } from "@pagopa/io-react-native-wallet";
import { createSlice } from "@reduxjs/toolkit";
import {
  getCredentialsCatalogueThunk,
  getCredentialsCatalogueTranslationsThunk,
} from "../../thunks/credentialsCatalogue";
import { asyncStatusInitial } from "../utils";
import type { AsyncStatus, RootState } from "../types";

type CredentialsCatalogueState = {
  catalogue: CredentialsCatalogue.DigitalCredentialsCatalogue | undefined;
  translations: CredentialsCatalogue.CatalogueTranslations | undefined;
  asyncStatus: AsyncStatus;
  translationsAsyncStatus: AsyncStatus;
};

const initialState: CredentialsCatalogueState = {
  catalogue: undefined,
  translations: undefined,
  asyncStatus: asyncStatusInitial,
  translationsAsyncStatus: asyncStatusInitial,
};

export const credentialsCatalogueSlice = createSlice({
  name: "credentialsCatalogue",
  initialState,
  reducers: {},
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
      state.asyncStatus.hasError = { status: true, error: action.error };
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
      }
    );

    builder.addCase(
      getCredentialsCatalogueTranslationsThunk.pending,
      (state) => {
        state.translationsAsyncStatus.isLoading = true;
        state.translationsAsyncStatus.isDone =
          initialState.translationsAsyncStatus.isDone;
        state.translationsAsyncStatus.hasError =
          initialState.translationsAsyncStatus.hasError;
      }
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
          status: true,
          error: action.error,
        };
      }
    );
  },
});

export const selectCredentialsCatalogueAsyncStatus = (state: RootState) =>
  state.credentialsCatalogue.asyncStatus;

export const selectCredentialsCatalogue = (state: RootState) =>
  state.credentialsCatalogue.catalogue;

export const selectCredentialsCatalogueTranslations = (state: RootState) =>
  state.credentialsCatalogue.translations;

export const selectCredentialsCatalogueTranslationsAsyncStatus = (
  state: RootState
) => state.credentialsCatalogue.translationsAsyncStatus;
