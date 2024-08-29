import type { SerializedError } from "@reduxjs/toolkit";
import type { store } from "./store";
import type { Credential } from "@pagopa/io-react-native-wallet";

/**
 * Type definition for the dispatch function of the Redux store.
 */
export type AppDispatch = typeof store.dispatch;

/**
 * Type definition for the root state of the Redux store.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Type definition for reducer which have a state consisting of three parameters to be used with {@link createAsyncThunk}.
 * Thunks create with {@link createAsyncThunk} will automatically dispatch three events: pending, fulfilled, and rejected.
 * This state will be used to track the status of the async operation.
 * - isDone: whether the operation is done
 * - isLoading: whether the operation is in progress
 * - hasError: whether the operation has failed and the error that occurred
 */
export type AsyncStatus = {
  isDone: boolean;
  isLoading: boolean;
  hasError:
    | { status: false; error: undefined }
    | { status: true; error: SerializedError };
};

/**
 * Union type that represents the supported credentials.
 * This simplifies the type definition of the `credential` store.
 */
export type SupportedCredentials =
  | "PersonIdentificationData"
  | "MDL"
  | "EuropeanDisabilityCard"
  | "EuropeanHealthInsuranceCard";

/**
 * Type definition to represent a credential result to be used in the store.
 */
export type CredentialResult = {
  credential: Awaited<
    ReturnType<Credential.Issuance.ObtainCredential>
  >["credential"];
  parsedCredential: Awaited<
    ReturnType<Credential.Issuance.VerifyAndParseCredential>
  >["parsedCredential"];
  keyTag: string;
  credentialType: SupportedCredentials;
};