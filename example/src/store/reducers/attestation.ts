import {
  IoWallet,
  type WalletInstanceAttestation as Wia,
} from "@pagopa/io-react-native-wallet";
import { createSelector, createSlice } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, RootState } from "../types";

import {
  getKeyAttestationThunk,
  getWalletInstanceAttestationThunk,
} from "../../thunks/attestation";
import { createSecureStorage } from "../storage";
import { asyncStatusInitial } from "../utils";
import { selectItwVersion } from "./environment";
import { instanceReset } from "./instance";
import { sessionReset } from "./session";

// State type definition for the attestion slice
interface AttestationState {
  ka: {
    asyncStatus: AsyncStatus;
    value?: string;
  };
  wia: {
    asyncStatus: AsyncStatus;
    value?: Record<Format, string>;
  };
}

// Supported Wallet Attestation formats
type Format = Awaited<
  ReturnType<Wia.WalletInstanceAttestationApi["getAttestation"]>
>[number]["format"];

// Initial state for the attestation slice
const initialState: AttestationState = {
  ka: {
    asyncStatus: asyncStatusInitial,
  },
  wia: {
    asyncStatus: asyncStatusInitial,
  },
};

/**
 * Redux slice for the attestion state. It contains the obtained attestation.
 * Currently it is not persisted or reused since each operation requires a new attestation.
 */
const attestationSlice = createSlice({
  extraReducers: (builder) => {
    // Dispatched when a get attestion async thunk resolves. Sets the attestation and resets the state.
    builder.addCase(
      getWalletInstanceAttestationThunk.fulfilled,
      (state, action) => {
        state.wia.asyncStatus.isDone = true;
        state.wia.value = action.payload.reduce(
          (acc, { attestation, format }) => ({ ...acc, [format]: attestation }),
          {} as Record<Format, string>,
        );
        state.wia.asyncStatus.isLoading =
          initialState.wia.asyncStatus.isLoading;
        state.wia.asyncStatus.hasError = initialState.wia.asyncStatus.hasError;
      },
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
        state.wia.asyncStatus.hasError = { error: action.error, status: true };
      },
    );

    builder.addCase(getKeyAttestationThunk.fulfilled, (state, action) => {
      state.ka.value = action.payload.attestation;
      state.ka.asyncStatus.isDone = true;
      state.ka.asyncStatus.isLoading = initialState.ka.asyncStatus.isLoading;
      state.ka.asyncStatus.hasError = initialState.ka.asyncStatus.hasError;
    });

    builder.addCase(getKeyAttestationThunk.pending, (state) => {
      state.ka.asyncStatus.isLoading = true;
      state.ka.asyncStatus.isDone = initialState.ka.asyncStatus.isDone;
      state.ka.asyncStatus.hasError = initialState.ka.asyncStatus.hasError;
    });

    builder.addCase(getKeyAttestationThunk.rejected, (state, action) => {
      state.ka.asyncStatus.isDone = initialState.ka.asyncStatus.isDone;
      state.ka.asyncStatus.isLoading = initialState.ka.asyncStatus.isLoading;
      state.ka.asyncStatus.hasError = { error: action.error, status: true };
    });

    // Reset the attestation state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the attestation state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
  initialState,
  name: "attestation",
  reducers: {
    attestationReset: () => initialState, // Reset the attestation state
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
  attestationSlice.reducer,
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

export const selectKeyAttestationAsyncState = (state: RootState) =>
  state.attestation.ka.asyncStatus;
export const selectKeyAttestation = (state: RootState) =>
  state.attestation.ka.value;

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
  },
);
