import { credentialReset } from "../store/reducers/credential";
import type { PidResult, SupportedCredentials } from "../store/types";
import { completeAuthorizationAndFetchCredential } from "../utils/credential";
import { createAppAsyncThunk } from "./utils";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

/**
 * Type definition for the input of the {@link completeAuthorizationThunk}.
 */
type CompleteAuthorizationThunkInput = {
  code: string;
  issuerConf: any;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  credentialDefinition: any;
  walletInstanceAttestation: string;
  wiaCryptoContext: CryptoContext;
  credentialType: Extract<SupportedCredentials, "PersonIdentificationData">;
};

/**
 * Thunk to complete the user authorization process and fetch the credential.
 * @param args - The input arguments required to complete the authorization and fetch the credential
 * @returns The obtained credential result
 */
export const completeAuthorizationThunk = createAppAsyncThunk<
  PidResult,
  CompleteAuthorizationThunkInput
>(
  "pid/completeAuthorization",
  async (args, { dispatch }) => {
    const {
      code,
      issuerConf,
      clientId,
      redirectUri,
      codeVerifier,
      credentialDefinition,
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType,
    } = args;

    // Resets the credential state before obtaining a new PID
    dispatch(credentialReset());
    return await completeAuthorizationAndFetchCredential({
      code,
      issuerConf,
      clientId,
      redirectUri,
      codeVerifier,
      credentialDefinition,
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType,
    });
  }
);
