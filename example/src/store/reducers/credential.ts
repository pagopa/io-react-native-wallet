import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";
import {
  getCredentialStatusAssertionThunk,
  type GetCredentialStatusAssertionThunkOutput,
  getCredentialThunk,
} from "../../thunks/credential";
import type {
  AsyncStatus,
  CredentialResult,
  EuropeanCredentialWithId,
  RemoveEuropeanCredentialPayload,
  RootState,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../types";
import { asyncStatusInitial } from "../utils";
import { sessionReset } from "./sesssion";
import { instanceReset } from "./instance";
import { createSecureStorage } from "../storage";
import {
  getTrustmarkThunk,
  type GetTrustmarkThunkOutput,
} from "../../thunks/trustmark";
import { getCredentialOfferFlowThunk } from "../../thunks/offer";
import { v4 as uuidv4 } from "uuid";

/**
 * State type definition for the credential slice.
 * It contains:
 * - credentials: the obtained credentials which are persisted, except for the PID which is stored in the PID slice {@link pidSlice}
 * - credentialsState: the state of the async operation to get each credential
 * - statusAssertion: the status assertion for the credentials
 * - statusAssertionAsyncStatus: the state of the async operation to get each credential status assertion
 */
type CredentialState = {
  credentials: Record<
    SupportedCredentialsWithoutPid,
    CredentialResult | undefined
  >;
  europeanCredentials: Record<string, Array<EuropeanCredentialWithId>>;
  credentialsAsyncStatus: Record<SupportedCredentialsWithoutPid, AsyncStatus>;
  statusAssertion: Record<
    SupportedCredentials,
    GetCredentialStatusAssertionThunkOutput | undefined
  >;
  statusAssertionAsyncStatus: Record<SupportedCredentials, AsyncStatus>;
  trustmark: Record<
    SupportedCredentialsWithoutPid,
    GetTrustmarkThunkOutput | undefined
  >;
  trustmarkAsyncStatus: Record<SupportedCredentialsWithoutPid, AsyncStatus>;
};

// Initial state for the credential slice
const initialState: CredentialState = {
  credentials: {
    dc_sd_jwt_mDL: undefined,
    mso_mdoc_mDL: undefined,
    dc_sd_jwt_EuropeanDisabilityCard: undefined,
    dc_sd_jwt_EuropeanHealthInsuranceCard: undefined,
    dc_sd_jwt_education_degree: undefined,
    dc_sd_jwt_education_enrollment: undefined,
    dc_sd_jwt_residency: undefined,
  },
  credentialsAsyncStatus: {
    dc_sd_jwt_mDL: asyncStatusInitial,
    mso_mdoc_mDL: asyncStatusInitial,
    dc_sd_jwt_EuropeanDisabilityCard: asyncStatusInitial,
    dc_sd_jwt_EuropeanHealthInsuranceCard: asyncStatusInitial,
    dc_sd_jwt_education_degree: asyncStatusInitial,
    dc_sd_jwt_education_enrollment: asyncStatusInitial,
    dc_sd_jwt_residency: asyncStatusInitial,
  },
  statusAssertion: {
    dc_sd_jwt_PersonIdentificationData: undefined,
    mso_mdoc_PersonIdentificationData: undefined,
    dc_sd_jwt_mDL: undefined,
    mso_mdoc_mDL: undefined,
    dc_sd_jwt_EuropeanDisabilityCard: undefined,
    dc_sd_jwt_EuropeanHealthInsuranceCard: undefined,
    dc_sd_jwt_education_degree: undefined,
    dc_sd_jwt_education_enrollment: undefined,
    dc_sd_jwt_residency: undefined,
  },
  statusAssertionAsyncStatus: {
    dc_sd_jwt_PersonIdentificationData: asyncStatusInitial,
    mso_mdoc_PersonIdentificationData: asyncStatusInitial,
    dc_sd_jwt_mDL: asyncStatusInitial,
    mso_mdoc_mDL: asyncStatusInitial,
    dc_sd_jwt_EuropeanDisabilityCard: asyncStatusInitial,
    dc_sd_jwt_EuropeanHealthInsuranceCard: asyncStatusInitial,
    dc_sd_jwt_education_degree: asyncStatusInitial,
    dc_sd_jwt_education_enrollment: asyncStatusInitial,
    dc_sd_jwt_residency: asyncStatusInitial,
  },
  trustmark: {
    dc_sd_jwt_mDL: undefined,
    mso_mdoc_mDL: undefined,
    dc_sd_jwt_EuropeanDisabilityCard: undefined,
    dc_sd_jwt_EuropeanHealthInsuranceCard: undefined,
    dc_sd_jwt_education_degree: undefined,
    dc_sd_jwt_education_enrollment: undefined,
    dc_sd_jwt_residency: undefined,
  },
  trustmarkAsyncStatus: {
    dc_sd_jwt_mDL: asyncStatusInitial,
    mso_mdoc_mDL: asyncStatusInitial,
    dc_sd_jwt_EuropeanDisabilityCard: asyncStatusInitial,
    dc_sd_jwt_EuropeanHealthInsuranceCard: asyncStatusInitial,
    dc_sd_jwt_education_degree: asyncStatusInitial,
    dc_sd_jwt_education_enrollment: asyncStatusInitial,
    dc_sd_jwt_residency: asyncStatusInitial,
  },
  europeanCredentials: {},
};

/**
 * Redux slice for the credentials state. It contains the credentials, the credential async operation state, the CiE L3 flow params,
 * the status assertions of the credentials and the status assertions async operation state.
 */
const credentialSlice = createSlice({
  name: "credential",
  initialState,
  reducers: {
    credentialReset: () => initialState,

    /**
     * Removes a european credential from the store given its credential id
     */
    removeEuropeanCredential: (
      state,
      action: PayloadAction<RemoveEuropeanCredentialPayload>
    ) => {
      const { type, id } = action.payload;

      const credentialsOfType = state.europeanCredentials[type];
      if (credentialsOfType) {
        state.europeanCredentials[type] = credentialsOfType.filter(
          (cred) => cred.id !== id
        );

        if (state.europeanCredentials[type]!.length === 0) {
          delete state.europeanCredentials[type];
        }
      }
    },

    /**
     * Removes a trustmark from the store given a credential type
     */
    trustmarkReset: (
      state,
      action: PayloadAction<SupportedCredentialsWithoutPid>
    ) => ({
      ...state,
      trustmark: {
        ...state.trustmark,
        [action.payload]: undefined,
      },
    }),
  },
  extraReducers: (builder) => {
    /**
     * Credential Thunk
     */

    /*
     * Dispatched when a get credential async thunk resolves.
     * Sets the obtained credential and its state to isDone
     * for the requested credential.
     */
    builder.addCase(getCredentialThunk.fulfilled, (state, action) => {
      const credentialType = action.payload.credentialType;
      // Set the credential
      state.credentials[credentialType] = action.payload;
      // Set the status
      state.credentialsAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /*
     * Dispatched when a get credential async thunk is pending.
     * Sets the credential state to isLoading while resetting isDone and hasError
     * for the requested credential.
     */
    builder.addCase(getCredentialThunk.pending, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.credentialsAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /*
     * Dispatched when a get credential async thunk rejected.
     * Sets the credential state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(getCredentialThunk.rejected, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.credentialsAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /**
     * Status Assertion Thunk
     */

    /* Dispatched when a getCredentialStatusAssertionThunk thunk resolves.
     * Sets the status assertion and its state to isDone for the requested credential while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAssertionThunk.fulfilled,
      (state, action) => {
        const credentialType = action.payload.credentialType;
        // Set the credential
        state.statusAssertion[credentialType] = action.payload;
        // Set the status
        state.statusAssertionAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          isDone: true,
        };
      }
    );

    /* Dispatched when a getCredentialStatusAssertionThunk thunk is pending.
     * Sets the status assertion state to isLoading while resetting isDone and hasError
     * for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAssertionThunk.pending,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAssertionAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          isLoading: true,
        };
      }
    );

    /* Dispatched when a getCredentialStatusAssertionThunk thunk rejected.
     * Sets the status assertion state to hasError while resetting isLoading and hasError
     * for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAssertionThunk.rejected,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAssertionAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          hasError: { status: true, error: action.error },
        };
      }
    );

    /**
     * Trustmark thunk
     */

    /*
     * Dispatched when a get trustmark async thunk resolves.
     * Sets the obtained trustmark and the state to isDone.
     */
    builder.addCase(getTrustmarkThunk.fulfilled, (state, action) => {
      const credentialType = action.payload.credentialType;
      // Set the trustmark
      state.trustmark[credentialType] = action.payload;
      // Set the status
      state.trustmarkAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /*
     * Dispatched when a get trustmark async thunk is pending.
     * Sets the trustmark state to isLoading while resetting isDone and hasError.
     */
    builder.addCase(getTrustmarkThunk.pending, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.trustmarkAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /*
     * Dispatched when a get trustmark async thunk rejected.
     * Sets the trustmark state to hasError while resetting isLoading and hasError.
     */
    builder.addCase(getTrustmarkThunk.rejected, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.trustmarkAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

    /*
     * Dispatched when a get credential offer flow async thunk resolves.
     * Sets the obtained european credential.
     */
    builder.addCase(getCredentialOfferFlowThunk.fulfilled, (state, action) => {
      const credentialType = action.payload.credentialType as string;
      const uniqueId = uuidv4();

      const newCredential: EuropeanCredentialWithId = {
        ...action.payload,
        id: uniqueId,
      };

      if (!state.europeanCredentials[credentialType]) {
        state.europeanCredentials[credentialType] = [];
      }

      state.europeanCredentials[credentialType]!.push(newCredential);
    });

    // Reset the credential state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the credential state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the credential slice.
 */
export const { credentialReset, trustmarkReset, removeEuropeanCredential } =
  credentialSlice.actions;

/**
 * Persist configuration for the credential slice.
 * We only persist the obtained credentials.
 */
const persistConfig: PersistConfig<CredentialState> = {
  key: "credential",
  storage: createSecureStorage(),
  whitelist: ["credentials", "europeanCredentials"],
};

/**
 * Persisted reducer for the credential slice.
 */
export const credentialReducer = persistReducer(
  persistConfig,
  credentialSlice.reducer
);

/**
 * Selects a credential from the credential state.
 * @param credentialType - The type of the credential to select
 * @returns the selected credential as {@link CredentialResult}
 */
export const selectCredential =
  (credentialType: SupportedCredentialsWithoutPid) => (state: RootState) =>
    state.credential.credentials[credentialType];

export const selectCredentials = (state: RootState) =>
  state.credential.credentials;

export const selectObtainedCredentials = createSelector(
  selectCredentials,
  (credentials): Array<CredentialResult> =>
    Object.values(credentials).filter(
      (cred) => cred !== undefined
    ) as Array<CredentialResult>
);

/**
 * Selects the state of the async operation of a given credential.
 * @param credentialType - The type of the credential to select the state
 * @returns the state of the async operation for the requested credential as {@link AsyncStatus}
 */
export const selectCredentialAsyncStatus =
  (credentialType: SupportedCredentialsWithoutPid) => (state: RootState) =>
    state.credential.credentialsAsyncStatus[credentialType];

/**
 * Selects the status assertions for all available credentials.
 * @returns The status assertions keyed by credential
 */
export const selectStatusAssertions = (state: RootState) =>
  state.credential.statusAssertion;

/**
 * Selects the state of the status assertion async operation of all available credentials.
 * @returns The state of the async operations keyed by credential {@link AsyncStatus}
 */
export const selectStatusAssertionAsyncStatuses = (state: RootState) =>
  state.credential.statusAssertionAsyncStatus;

/**
 * Selects the trustmark signed JWT from the trustmark state.
 * @returns the trustmark signed JWT
 */
export const selectTrustmark =
  (credentialType: SupportedCredentialsWithoutPid) => (state: RootState) =>
    state.credential.trustmark[credentialType];

/**
 * Selects the state of the async operation of the trustmark.
 * @returns the state of the async operation for the trustmark as {@link AsyncStatus}
 */
export const selectTrustmarkAsyncStatus =
  (credentialType: SupportedCredentialsWithoutPid) => (state: RootState) =>
    state.credential.trustmarkAsyncStatus[credentialType];

/**
 * Selects the european credentials record from the credential state.
 * @param state - The root state of the Redux store
 */
const selectEuropeanCredentialsRecord = (state: RootState) =>
  state.credential.europeanCredentials;

/**
 * Selects the european credentials from the credential state and flattens them into an array.
 * Memoized to prevent unnecessary re-renders.
 * @param state - The root state of the Redux store
 * @returns a flat array of all EuropeanCredentialWithId
 */
export const selectEuropeanCredentials = createSelector(
  [selectEuropeanCredentialsRecord],
  (europeanCredentialsRecord) => {
    return Object.values(
      europeanCredentialsRecord
    ).flat() as Array<EuropeanCredentialWithId>;
  }
);
