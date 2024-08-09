import {
  createAsyncThunk,
  type ThunkAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import type { RootState } from "../store/store";
import type { AppDispatch } from "../store/dispatch";
import type { Credential } from "@pagopa/io-react-native-wallet";
import type { SupportedCredentials } from "../store/utilts";

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: unknown;
}>();

export type GetCredentialThunk = {
  credential: Awaited<
    ReturnType<Credential.Issuance.ObtainCredential>
  >["credential"];
  parsedCredential: Awaited<
    ReturnType<Credential.Issuance.VerifyAndParseCredential>
  >["parsedCredential"];
  keyTag: string;
  credentialType: SupportedCredentials;
};
