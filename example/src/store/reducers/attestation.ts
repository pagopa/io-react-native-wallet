import { createSelector, createSlice } from "@reduxjs/toolkit";
import { persistReducer, type PersistConfig } from "redux-persist";
import {
  IoWallet,
  type WalletInstanceAttestation as Wia,
} from "@pagopa/io-react-native-wallet";
import {
  getWalletInstanceAttestationThunk,
  getWalletUnitAttestationThunk,
} from "../../thunks/attestation";
import { createSecureStorage } from "../storage";
import type { AsyncStatus, RootState } from "../types";
import { asyncStatusInitial } from "../utils";
import { instanceReset } from "./instance";
import { sessionReset } from "./session";
import { selectItwVersion } from "./environment";

// Supported Wallet Attestation formats
type Format = Awaited<
  ReturnType<Wia.WalletInstanceAttestationApi["getAttestation"]>
>[number]["format"];

// State type definition for the attestion slice
type AttestationState = {
  wia: {
    value?: Record<Format, string>;
    asyncStatus: AsyncStatus;
  };
  wua: {
    value?: string;
    asyncStatus: AsyncStatus;
  };
};

// Initial state for the attestation slice
const initialState: AttestationState = {
  wia: {
    asyncStatus: asyncStatusInitial,
  },
  wua: {
    asyncStatus: asyncStatusInitial,
  },
};

/**
 * Redux slice for the attestion state. It contains the obtained attestation.
 * Currently it is not persisted or reused since each operation requires a new attestation.
 */
const attestationSlice = createSlice({
  name: "attestation",
  initialState,
  reducers: {
    attestationReset: () => initialState, // Reset the attestation state
  },
  extraReducers: (builder) => {
    // Dispatched when a get attestion async thunk resolves. Sets the attestation and resets the state.
    builder.addCase(
      getWalletInstanceAttestationThunk.fulfilled,
      (state, action) => {
        state.wia.asyncStatus.isDone = true;
        state.wia.value = action.payload.reduce(
          (acc, { format, attestation }) => ({ ...acc, [format]: attestation }),
          {} as Record<Format, string>
        );
        state.wia.asyncStatus.isLoading =
          initialState.wia.asyncStatus.isLoading;
        state.wia.asyncStatus.hasError = initialState.wia.asyncStatus.hasError;
      }
    );

    // Dispatched when a get attestion async thunk is pending. Sets the loading state to true and resets done and hasError.
    builder.addCase(getWalletInstanceAttestationThunk.pending, (state) => {
      // Sets the loading state and resets done and hasError;
      state.wia.asyncStatus.isLoading = true;
      state.wia.asyncStatus.isDone = initialState.wia.asyncStatus.isDone;
      state.wia.asyncStatus.hasError = initialState.wia.asyncStatus.hasError;
    });

    // Dispatched when a get attestion async thunk rejects. Sets the attestation state to hasError and resets loading and isDone.
    builder.addCase(
      getWalletInstanceAttestationThunk.rejected,
      (state, action) => {
        // Sets the hasError state and resets done and loading.
        state.wia.asyncStatus.isDone = initialState.wia.asyncStatus.isDone;
        state.wia.asyncStatus.isLoading =
          initialState.wia.asyncStatus.isLoading;
        state.wia.asyncStatus.hasError = { status: true, error: action.error };
      }
    );

    builder.addCase(
      getWalletUnitAttestationThunk.fulfilled,
      (state, action) => {
        state.wua.asyncStatus.isDone = true;
        state.wua.value = action.payload.attestation;
        state.wua.asyncStatus.isLoading =
          initialState.wua.asyncStatus.isLoading;
        state.wua.asyncStatus.hasError = initialState.wua.asyncStatus.hasError;
      }
    );

    builder.addCase(getWalletUnitAttestationThunk.pending, (state) => {
      state.wua.asyncStatus.isLoading = true;
      state.wua.asyncStatus.isDone = initialState.wua.asyncStatus.isDone;
      state.wua.asyncStatus.hasError = initialState.wua.asyncStatus.hasError;
    });

    builder.addCase(getWalletUnitAttestationThunk.rejected, (state, action) => {
      state.wua.asyncStatus.isDone = initialState.wua.asyncStatus.isDone;
      state.wua.asyncStatus.isLoading = initialState.wua.asyncStatus.isLoading;
      state.wua.asyncStatus.hasError = { status: true, error: action.error };
    });

    // Reset the attestation state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the attestaion slice.
 */
export const { attestationReset } = attestationSlice.actions;

/**
 * Persist configuration for the attestation slice.
 */
const persistConfig: PersistConfig<AttestationState> = {
  key: "attestation",
  storage: createSecureStorage(),
  whitelist: ["wia", "wua"],
};

/**
 * Persisted reducer for the credential slice.
 */
export const attestationReducer = persistReducer(
  persistConfig,
  attestationSlice.reducer
);

/**
 * Selector which returns the attestation state of the related async operation.
 * @param state - The root state of the Redux store
 * @returns the attestion state
 */
export const selectWalletInstanceAttestationAsyncStatus = (state: RootState) =>
  state.attestation.wia.asyncStatus;

/**
 * Selects the attestation from the attestation state in the given format.
 * @param format - The format of the attestation to select
 * @param state - The root state of the Redux store
 * @returns the attestation
 */
export const makeSelectWalletInstanceAttestation =
  (format: Format) => (state: RootState) =>
    state.attestation.wia.value?.[format];

export const selectWalletInstanceAttestationAsJwt =
  makeSelectWalletInstanceAttestation("jwt");
export const selectWalletInstanceAttestationAsSdJwt =
  makeSelectWalletInstanceAttestation("dc+sd-jwt");
export const selectWalletInstanceAttestationAsMdoc =
  makeSelectWalletInstanceAttestation("mso_mdoc");

export const selectWalletUnitAttestationAsyncState = (state: RootState) =>
  state.attestation.wua.asyncStatus;
export const selectWalletUnitAttestation = (state: RootState) =>
  state.attestation.wua.value;

/**
 * Checks if the Wallet Instance Attestation needs to be requested by
 * checking the expiry date
 * @param state - the root state of the Redux store
 * @returns true if the Wallet Instance Attestation is expired or not present
 */
export const shouldRequestWalletInstanceAttestationSelector = createSelector(
  selectWalletInstanceAttestationAsJwt,
  selectItwVersion,
  (attestation, itwVersion) => {
    if (!attestation) {
      return true;
    }
    const wallet = new IoWallet({ version: itwVersion });
    const payload = wallet.WalletInstanceAttestation.decode(attestation);
    const expiryDate = new Date(payload.exp * 1000);
    const now = new Date();
    return now > expiryDate;
  }
);
