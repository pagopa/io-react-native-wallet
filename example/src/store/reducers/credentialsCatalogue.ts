import type { CredentialsCatalogue } from "@pagopa/io-react-native-wallet";
import { createSlice } from "@reduxjs/toolkit";
import { getCredentialsCatalogueThunk } from "../../thunks/credentialsCatalogue";
import { asyncStatusInitial } from "../utils";
import type { AsyncStatus, RootState } from "../types";

type CredentialsCatalogueState = {
  catalogue: CredentialsCatalogue.DigitalCredentialsCatalogue | undefined;
  asyncStatus: AsyncStatus;
};

const initialState: CredentialsCatalogueState = {
  catalogue: undefined,
  asyncStatus: asyncStatusInitial,
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
  },
});

export const selectCredentialsCatalogueAsyncStatus = (state: RootState) =>
  state.credentialsCatalogue.asyncStatus;

export const selectCredentialsCatalogue = (state: RootState) =>
  state.credentialsCatalogue.catalogue;
