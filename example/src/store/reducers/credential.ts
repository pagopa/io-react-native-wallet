import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { type PersistConfig, persistReducer } from "redux-persist";
import {
  getCredentialStatusAssertionThunk,
  type CredentialStatusResult,
  getCredentialThunk,
  getCredentialStatusListThunk,
} from "../../thunks/credential";
import type {
  AsyncStatus,
  CredentialResult,
  RootState,
  SupportedCredentials,
  SupportedCredentialsWithoutPid,
} from "../types";
import { asyncStatusInitial } from "../utils";
import { sessionReset } from "./session";
import { instanceReset } from "./instance";
import { createSecureStorage } from "../storage";
import {
  getTrustmarkThunk,
  type GetTrustmarkThunkOutput,
} from "../../thunks/trustmark";

/**
 * State type definition for the credential slice.
 * It contains:
 * - credentials: the obtained credentials which are persisted, except for the PID which is stored in the PID slice {@link pidSlice}
 * - credentialsState: the state of the async operation to get each credential
 * - status: the status result for each credential (either a status assertion or a status list entry)
 * - statusAsyncStatus: the state of the async operation to get each credential status
 */
type CredentialState = {
  credentials: Record<
    SupportedCredentialsWithoutPid,
    CredentialResult | undefined
  >;
  credentialsAsyncStatus: Record<SupportedCredentialsWithoutPid, AsyncStatus>;
  status: Record<SupportedCredentials, CredentialStatusResult | undefined>;
  statusAsyncStatus: Record<SupportedCredentials, AsyncStatus>;
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
    dc_sd_jwt_education_diploma: undefined,
    dc_sd_jwt_education_attendance: undefined,
  },
  credentialsAsyncStatus: {
    dc_sd_jwt_mDL: asyncStatusInitial,
    mso_mdoc_mDL: asyncStatusInitial,
    dc_sd_jwt_EuropeanDisabilityCard: asyncStatusInitial,
    dc_sd_jwt_EuropeanHealthInsuranceCard: asyncStatusInitial,
    dc_sd_jwt_education_degree: asyncStatusInitial,
    dc_sd_jwt_education_enrollment: asyncStatusInitial,
    dc_sd_jwt_residency: asyncStatusInitial,
    dc_sd_jwt_education_diploma: asyncStatusInitial,
    dc_sd_jwt_education_attendance: asyncStatusInitial,
  },
  status: {
    PersonIdentificationData: undefined,
    dc_sd_jwt_mDL: undefined,
    mso_mdoc_mDL: undefined,
    dc_sd_jwt_EuropeanDisabilityCard: undefined,
    dc_sd_jwt_EuropeanHealthInsuranceCard: undefined,
    dc_sd_jwt_education_degree: undefined,
    dc_sd_jwt_education_enrollment: undefined,
    dc_sd_jwt_residency: undefined,
    dc_sd_jwt_education_diploma: undefined,
    dc_sd_jwt_education_attendance: undefined,
  },
  statusAsyncStatus: {
    PersonIdentificationData: asyncStatusInitial,
    dc_sd_jwt_mDL: asyncStatusInitial,
    mso_mdoc_mDL: asyncStatusInitial,
    dc_sd_jwt_EuropeanDisabilityCard: asyncStatusInitial,
    dc_sd_jwt_EuropeanHealthInsuranceCard: asyncStatusInitial,
    dc_sd_jwt_education_degree: asyncStatusInitial,
    dc_sd_jwt_education_enrollment: asyncStatusInitial,
    dc_sd_jwt_residency: asyncStatusInitial,
    dc_sd_jwt_education_diploma: asyncStatusInitial,
    dc_sd_jwt_education_attendance: asyncStatusInitial,
  },
  trustmark: {
    dc_sd_jwt_mDL: undefined,
    mso_mdoc_mDL: undefined,
    dc_sd_jwt_EuropeanDisabilityCard: undefined,
    dc_sd_jwt_EuropeanHealthInsuranceCard: undefined,
    dc_sd_jwt_education_degree: undefined,
    dc_sd_jwt_education_enrollment: undefined,
    dc_sd_jwt_residency: undefined,
    dc_sd_jwt_education_diploma: undefined,
    dc_sd_jwt_education_attendance: undefined,
  },
  trustmarkAsyncStatus: {
    dc_sd_jwt_mDL: asyncStatusInitial,
    mso_mdoc_mDL: asyncStatusInitial,
    dc_sd_jwt_EuropeanDisabilityCard: asyncStatusInitial,
    dc_sd_jwt_EuropeanHealthInsuranceCard: asyncStatusInitial,
    dc_sd_jwt_education_degree: asyncStatusInitial,
    dc_sd_jwt_education_enrollment: asyncStatusInitial,
    dc_sd_jwt_residency: asyncStatusInitial,
    dc_sd_jwt_education_diploma: asyncStatusInitial,
    dc_sd_jwt_education_attendance: asyncStatusInitial,
  },
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
     * Status Thunks (status assertion and status list)
     */

    /* Dispatched when a getCredentialStatusAssertionThunk thunk resolves.
     * Sets the status and its state to isDone for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAssertionThunk.fulfilled,
      (state, action) => {
        const credentialType = action.payload.credentialType;
        state.status[credentialType] = action.payload;
        state.statusAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          isDone: true,
        };
      }
    );

    /* Dispatched when a getCredentialStatusAssertionThunk thunk is pending.
     * Sets the status state to isLoading for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAssertionThunk.pending,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          isLoading: true,
        };
      }
    );

    /* Dispatched when a getCredentialStatusAssertionThunk thunk rejected.
     * Sets the status state to hasError for the requested credential.
     */
    builder.addCase(
      getCredentialStatusAssertionThunk.rejected,
      (state, action) => {
        const credentialType = action.meta.arg.credentialType;
        state.statusAsyncStatus[credentialType] = {
          ...asyncStatusInitial,
          hasError: { status: true, error: action.error },
        };
      }
    );

    /* Dispatched when a getStatusListThunk thunk resolves.
     * Sets the status and its state to isDone for the requested credential.
     */
    builder.addCase(getCredentialStatusListThunk.fulfilled, (state, action) => {
      const credentialType = action.payload.credentialType;
      state.status[credentialType] = action.payload;
      state.statusAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isDone: true,
      };
    });

    /* Dispatched when a getStatusListThunk thunk is pending.
     * Sets the status state to isLoading for the requested credential.
     */
    builder.addCase(getCredentialStatusListThunk.pending, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.statusAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        isLoading: true,
      };
    });

    /* Dispatched when a getStatusListThunk thunk rejected.
     * Sets the status state to hasError for the requested credential.
     */
    builder.addCase(getCredentialStatusListThunk.rejected, (state, action) => {
      const credentialType = action.meta.arg.credentialType;
      state.statusAsyncStatus[credentialType] = {
        ...asyncStatusInitial,
        hasError: { status: true, error: action.error },
      };
    });

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

    // Reset the credential state when the instance is reset.
    builder.addCase(instanceReset, () => initialState);

    // Reset the credential state when the session is reset.
    builder.addCase(sessionReset, () => initialState);
  },
});

/**
 * Exports the actions for the credential slice.
 */
export const { credentialReset, trustmarkReset } = credentialSlice.actions;

/**
 * Persist configuration for the credential slice.
 * We only persist the obtained credentials.
 */
const persistConfig: PersistConfig<CredentialState> = {
  key: "credential",
  storage: createSecureStorage(),
  whitelist: ["credentials"],
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
 * Selects the status result for all available credentials.
 * @returns The status results keyed by credential
 */
export const selectStatuses = (state: RootState) => state.credential.status;

/**
 * Selects the state of the status async operation of all available credentials.
 * @returns The state of the async operations keyed by credential {@link AsyncStatus}
 */
export const selectStatusAsyncStatuses = (state: RootState) =>
  state.credential.statusAsyncStatus;

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
