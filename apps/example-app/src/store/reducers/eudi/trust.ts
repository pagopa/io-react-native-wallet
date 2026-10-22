import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSlice } from "@reduxjs/toolkit";
import { PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, RootState } from "../../types";

import { bootstrapLoTEsThunk } from "../../../thunks/eudi/trust";
import { asyncStatusInitial } from "../../utils";

export interface EudiTrustState {
  /** Whether the LoTEs of the last bootstrap are the ones for negative tests */
  isNegativeLotes: boolean;
  /** LoTEs successfully fetched and validated by the last bootstrap, by profile */
  lotes: Eudi.Trust.LoTEs;
  /** LoTEs that could not be fetched or validated by the last bootstrap */
  lotesFailures: { message: string; profile: string }[];
  lotesStatus: AsyncStatus;
  /** Number of LoTEs requested by the last bootstrap */
  lotesTotal: number;
}

const initialState: EudiTrustState = {
  isNegativeLotes: false,
  lotes: {},
  lotesFailures: [],
  lotesStatus: asyncStatusInitial,
  lotesTotal: 0,
};

/**
 * Redux slice for the EUDI Trust model.
 */
const eudiTrustSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(bootstrapLoTEsThunk.fulfilled, (state, action) => {
      state.lotes = action.payload.lotes;
      state.lotesFailures = action.payload.failures;
      state.lotesTotal = action.payload.total;
      state.lotesStatus = { ...asyncStatusInitial, isDone: true };
    });

    builder.addCase(bootstrapLoTEsThunk.pending, (state, action) => {
      state.isNegativeLotes = action.meta.arg;
      state.lotes = {};
      state.lotesFailures = [];
      state.lotesStatus = { ...asyncStatusInitial, isLoading: true };
    });

    builder.addCase(bootstrapLoTEsThunk.rejected, (state, action) => {
      state.lotesStatus = {
        ...asyncStatusInitial,
        hasError: { error: action.error, status: true },
      };
    });
  },
  initialState,
  name: "eudiTrust",
  reducers: {
    eudiTrustReset: () => initialState,
  },
});

export const { eudiTrustReset } = eudiTrustSlice.actions;

/**
 * The List of Trusted Entities are persisted so they can be reused
 */
const persistConfig: PersistConfig<EudiTrustState> = {
  key: "eudiTrust",
  storage: AsyncStorage,
  whitelist: ["isNegativeLotes", "lotes", "lotesFailures", "lotesTotal"],
};

export const eudiTrustReducer = persistReducer(
  persistConfig,
  eudiTrustSlice.reducer,
);

export const selectEudiLotesStatus = (state: RootState) =>
  state.eudiTrust.lotesStatus;

export const selectEudiLotesFailures = (state: RootState) =>
  state.eudiTrust.lotesFailures;

export const selectEudiLotesTotal = (state: RootState) =>
  state.eudiTrust.lotesTotal;

export const selectEudiLotes = (state: RootState) => state.eudiTrust.lotes;

export const selectEudiLoteByProfile =
  (profile: Eudi.Trust.LoTEProfile) => (state: RootState) =>
    state.eudiTrust.lotes[profile];

export const selectEudiIsNegativeLotes = (state: RootState) =>
  state.eudiTrust.isNegativeLotes;
