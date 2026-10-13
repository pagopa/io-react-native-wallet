import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import { createSlice } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, RootState } from "../../types";

import {
  createEudiWalletInstanceThunk,
  type EudiWalletInstance,
  getEudiKeyAttestationThunk,
  getEudiWalletAttestationThunk,
} from "../../../thunks/eudi/walletAttestation";
import { createSecureStorage } from "../../storage";
import { asyncStatusInitial } from "../../utils";

export interface EudiWalletAttestationState {
  instance?: EudiWalletInstance;
  instanceStatus: AsyncStatus;
  /** Last Key Attestation in JWT format, also requested by each issuance with the Wallet Attestation */
  keyAttestation?: string;
  keyAttestationStatus: AsyncStatus;
  /** Wallet Attestation in JWT format, bound to the current instance */
  walletAttestation?: string;
  walletAttestationStatus: AsyncStatus;
}

const initialState: EudiWalletAttestationState = {
  instanceStatus: asyncStatusInitial,
  keyAttestationStatus: asyncStatusInitial,
  walletAttestationStatus: asyncStatusInitial,
};

/**
 * Redux slice for the EUDI Wallet Instance and its Wallet Attestation, separate from the IT-Wallet ones.
 */
const eudiWalletAttestationSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(createEudiWalletInstanceThunk.fulfilled, (_, action) => ({
      ...initialState,
      instance: action.payload,
      instanceStatus: { ...asyncStatusInitial, isDone: true },
    }));

    builder.addCase(createEudiWalletInstanceThunk.pending, (state) => {
      state.instanceStatus = { ...asyncStatusInitial, isLoading: true };
    });

    builder.addCase(createEudiWalletInstanceThunk.rejected, (state, action) => {
      state.instanceStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });

    builder.addCase(
      getEudiWalletAttestationThunk.fulfilled,
      (state, action) => {
        state.walletAttestation = action.payload;
        state.walletAttestationStatus = { ...asyncStatusInitial, isDone: true };
      },
    );

    builder.addCase(getEudiWalletAttestationThunk.pending, (state) => {
      state.walletAttestationStatus = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    builder.addCase(getEudiWalletAttestationThunk.rejected, (state, action) => {
      state.walletAttestationStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });

    builder.addCase(getEudiKeyAttestationThunk.fulfilled, (state, action) => {
      state.keyAttestation = action.payload;
      state.keyAttestationStatus = { ...asyncStatusInitial, isDone: true };
    });

    builder.addCase(getEudiKeyAttestationThunk.pending, (state) => {
      state.keyAttestationStatus = { ...asyncStatusInitial, isLoading: true };
    });

    builder.addCase(getEudiKeyAttestationThunk.rejected, (state, action) => {
      state.keyAttestationStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });
  },
  initialState,
  name: "eudiWalletAttestation",
  reducers: {
    eudiWalletAttestationReset: () => initialState,
  },
});

export const { eudiWalletAttestationReset } =
  eudiWalletAttestationSlice.actions;

/**
 * The Wallet Instance and its Wallet Attestation are persisted, in the secure storage.
 */
const persistConfig: PersistConfig<EudiWalletAttestationState> = {
  key: "eudiWalletAttestation",
  storage: createSecureStorage(),
  whitelist: ["instance", "walletAttestation"],
};

export const eudiWalletAttestationReducer = persistReducer(
  persistConfig,
  eudiWalletAttestationSlice.reducer,
);

export const selectEudiWalletInstance = (state: RootState) =>
  state.eudiWalletAttestation.instance;

export const selectEudiWalletInstanceOrThrow = (state: RootState) => {
  const instance = selectEudiWalletInstance(state);
  if (!instance) {
    throw new Error("Create an EUDI Wallet Instance first");
  }
  return instance;
};

export const selectEudiWalletInstanceStatus = (state: RootState) =>
  state.eudiWalletAttestation.instanceStatus;

export const selectEudiWalletAttestation = (state: RootState) =>
  state.eudiWalletAttestation.walletAttestation;

export const selectEudiWalletAttestationStatus = (state: RootState) =>
  state.eudiWalletAttestation.walletAttestationStatus;

export const selectEudiKeyAttestation = (state: RootState) =>
  state.eudiWalletAttestation.keyAttestation;

export const selectEudiKeyAttestationStatus = (state: RootState) =>
  state.eudiWalletAttestation.keyAttestationStatus;

/**
 * Maximum age of a Wallet Attestation to reuse it. The EU reference issuer rejects attestations
 * issued more than 1 hour before, both at PAR and at the Token Endpoint, so a margin is left
 * for the user authorization between the two.
 */
const WALLET_ATTESTATION_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Whether the Wallet Attestation must be requested, because missing, expired or too old
 */
export const selectShouldRequestEudiWalletAttestation = (state: RootState) => {
  const walletAttestation = selectEudiWalletAttestation(state);
  if (!walletAttestation) {
    return true;
  }
  const { exp, iat } =
    Eudi.WalletAttestation.decodeWalletAttestation(walletAttestation).payload;
  const now = Date.now();
  return now > exp * 1000 || now - iat * 1000 > WALLET_ATTESTATION_MAX_AGE_MS;
};
