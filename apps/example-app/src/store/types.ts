import type { CredentialIssuance } from "@io-app-it-wallet/io-react-native-wallet";
import type { SerializedError } from "@reduxjs/toolkit";

import type { RemoteKey } from "../utils/remoteCrypto";
import type { store } from "./store";

/**
 * Type definition for the dispatch function of the Redux store.
 */
export type AppDispatch = typeof store.dispatch;

/**
 * Type definition for reducer which have a state consisting of three parameters to be used with {@link createAsyncThunk}.
 * Thunks create with {@link createAsyncThunk} will automatically dispatch three events: pending, fulfilled, and rejected.
 * This state will be used to track the status of the async operation.
 * - isDone: whether the operation is done
 * - isLoading: whether the operation is in progress
 * - hasError: whether the operation has failed and the error that occurred
 */
export interface AsyncStatus {
  hasError:
    | { error: SerializedError; status: true }
    | { error: undefined; status: false };
  isDone: boolean;
  isLoading: boolean;
}

/**
 * Type definition to represent a credential result to be used in the store.
 */
export type CredentialResult = CredentialResultBase & {
  credentialType: SupportedCredentialsWithoutPid;
};

/**
 * Possible environments in the store.
 */

/**
 * Type definition to represent a PID result to be used in the store.
 */
export type PidResult = CredentialResultBase & {
  credentialType: Extract<SupportedCredentials, "PersonIdentificationData">;
  /** Present when the credential key lives on the Remote WSCD instead of the device. */
  remoteKey?: RemoteKey;
};

/**
 * Type definition for the root state of the Redux store.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Union type that represents the supported credentials.
 * This simplifies the type definition of the `credential` store.
 */
export type SupportedCredentials =
  | "dc_sd_jwt_EuropeanDisabilityCard"
  | "dc_sd_jwt_PariBonus"
  | "org.iso.18013.5.1.mDL"
  | "PersonIdentificationData";

/**
 * Type definition for the supported credentials without the PersonIdentificationData.
 */
export type SupportedCredentialsWithoutPid = Exclude<
  SupportedCredentials,
  "PersonIdentificationData"
>;

/**
 * Type definition to represent a credential result to be used in the store.
 */
interface CredentialResultBase {
  credential: string;
  credentialConfigurationId: string;
  credentialType: SupportedCredentials;
  format: CredentialIssuance.CredentialFormat;
  keyTag: string;
  parsedCredential: CredentialIssuance.ParsedCredential;
}
