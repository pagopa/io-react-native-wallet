import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, RootState } from "../../types";

import {
  deleteEudiCredentialThunk,
  obtainEudiCredentialThunk,
} from "../../../thunks/eudi/issuance";
import { createSecureStorage } from "../../storage";
import { asyncStatusInitial } from "../../utils";

export interface EudiCredential {
  /** The raw credential, as issued */
  credential: string;
  credentialConfigurationId: string;
  /** How to display the credential, from the Credential Issuer Metadata. Missing for credentials obtained before it was stored */
  display?: Eudi.CredentialIssuance.CredentialDisplay;
  format: string;
  issuer: string;
  /** Tag of the key the credential is bound to, also used as credential identifier */
  keyTag: string;
  obtainedAt: string;
}

export interface EudiCredentialsState {
  credentials: EudiCredential[];
  issuanceStatus: AsyncStatus;
}

const initialState: EudiCredentialsState = {
  credentials: [],
  issuanceStatus: asyncStatusInitial,
};

/**
 * Redux slice for the EUDI Wallet credentials, separate from the IT-Wallet ones.
 */
const eudiCredentialsSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(obtainEudiCredentialThunk.fulfilled, (state, action) => {
      state.credentials.push(action.payload);
      state.issuanceStatus = { ...asyncStatusInitial, isDone: true };
    });

    builder.addCase(obtainEudiCredentialThunk.pending, (state) => {
      state.issuanceStatus = { ...asyncStatusInitial, isLoading: true };
    });

    builder.addCase(obtainEudiCredentialThunk.rejected, (state, action) => {
      state.issuanceStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });

    builder.addCase(deleteEudiCredentialThunk.fulfilled, (state, action) => {
      state.credentials = state.credentials.filter(
        (c) => c.keyTag !== action.payload,
      );
    });
  },
  initialState,
  name: "eudiCredentials",
  reducers: {
    // Sets the display of a credential obtained before it was stored at issuance
    eudiCredentialDisplaySet: (
      state,
      action: PayloadAction<{
        display: Eudi.CredentialIssuance.CredentialDisplay;
        keyTag: string;
      }>,
    ) => {
      const credential = state.credentials.find(
        (c) => c.keyTag === action.payload.keyTag,
      );
      if (credential) {
        credential.display = action.payload.display;
      }
    },
    eudiCredentialIssuanceReset: (state) => {
      state.issuanceStatus = asyncStatusInitial;
    },
  },
});

export const { eudiCredentialDisplaySet, eudiCredentialIssuanceReset } =
  eudiCredentialsSlice.actions;

/**
 * Only the obtained credentials are persisted, in the secure storage.
 */
const persistConfig: PersistConfig<EudiCredentialsState> = {
  key: "eudiCredentials",
  storage: createSecureStorage(),
  whitelist: ["credentials"],
};

export const eudiCredentialsReducer = persistReducer(
  persistConfig,
  eudiCredentialsSlice.reducer,
);

export const selectEudiCredentials = (state: RootState) =>
  state.eudiCredentials.credentials;

export const selectEudiCredential = (keyTag: string) => (state: RootState) =>
  state.eudiCredentials.credentials.find((c) => c.keyTag === keyTag);

export const selectEudiCredentialIssuanceStatus = (state: RootState) =>
  state.eudiCredentials.issuanceStatus;
