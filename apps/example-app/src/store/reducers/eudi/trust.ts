import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSelector, createSlice } from "@reduxjs/toolkit";
import { createTransform, PersistConfig, persistReducer } from "redux-persist";

import type { AsyncStatus, RootState } from "../../types";

import { fetchLoTEThunk } from "../../../thunks/eudi/trust";
import { asyncStatusInitial } from "../../utils";

/** A LoTE with the status of its last fetch */
export interface EudiLoTE {
  /** Whether the LoTE is the one for negative tests */
  isNegative?: boolean;
  /** The LoTE, when successfully fetched and validated */
  lote?: Eudi.Trust.ParsedLoTE;
  /** Status of the last fetch, not persisted */
  status?: AsyncStatus;
}

export interface EudiTrustState {
  /** The LoTEs, by profile */
  lotes: EudiLoTEs;
}

type EudiLoTEs = Partial<Record<Eudi.Trust.LoTEProfile, EudiLoTE>>;

const initialState: EudiTrustState = {
  lotes: {},
};

/**
 * Redux slice for the EUDI Trust model.
 */
const eudiTrustSlice = createSlice({
  extraReducers: (builder) => {
    builder.addCase(fetchLoTEThunk.pending, (state, action) => {
      state.lotes[action.meta.arg.profile] = {
        status: { ...asyncStatusInitial, isLoading: true },
      };
    });

    builder.addCase(fetchLoTEThunk.fulfilled, (state, action) => {
      const { isNegative, profile } = action.meta.arg;
      state.lotes[profile] = {
        isNegative,
        lote: action.payload,
        status: { ...asyncStatusInitial, isDone: true },
      };
    });

    builder.addCase(fetchLoTEThunk.rejected, (state, action) => {
      state.lotes[action.meta.arg.profile] = {
        status: {
          ...asyncStatusInitial,
          hasError: { error: action.error, status: true },
        },
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

/** The status of the fetches is not persisted, as an interrupted fetch would stay loading */
const withoutStatus = createTransform<EudiLoTEs, EudiLoTEs>(
  (lotes) =>
    Object.fromEntries(
      Object.entries(lotes).map(([profile, { isNegative, lote }]) => [
        profile,
        { isNegative, lote },
      ]),
    ),
  (lotes) => lotes,
  { whitelist: ["lotes"] },
);

/**
 * The List of Trusted Entities are persisted so they can be reused
 */
const persistConfig: PersistConfig<EudiTrustState> = {
  key: "eudiTrust",
  storage: AsyncStorage,
  transforms: [withoutStatus],
  whitelist: ["lotes"],
};

export const eudiTrustReducer = persistReducer(
  persistConfig,
  eudiTrustSlice.reducer,
);

/** The LoTEs with the status of their last fetch, by profile */
export const selectEudiLoTEsWithStatus = (state: RootState) =>
  state.eudiTrust.lotes;

/** The successfully fetched and validated LoTEs, by profile */
export const selectEudiLotes = createSelector(
  selectEudiLoTEsWithStatus,
  (lotes): Eudi.Trust.LoTEs =>
    Object.fromEntries(
      Object.entries(lotes).flatMap(([profile, { lote }]) =>
        lote ? [[profile, lote]] : [],
      ),
    ),
);
