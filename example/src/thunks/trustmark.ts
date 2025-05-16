import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import { selectAttestationAsJwt } from "../store/reducers/attestation";
import type { SupportedCredentialsWithoutPid } from "../store/types";
import { WIA_KEYTAG } from "../utils/crypto";
import { createAppAsyncThunk } from "./utils";

/**
 * Type definition for the input of the {@link getTrustmarkThunk}.
 */
type GetTrustmarkThunkInput = {
  credentialType: SupportedCredentialsWithoutPid;
  documentNumber?: string;
};

export type GetTrustmarkThunkOutput = {
  trustmarkJwt: string;
  credentialType: SupportedCredentialsWithoutPid;
  expirationTime: number;
};

/**
 * Thunk to obtain a new trustmark for a credential.
 */
export const getTrustmarkThunk = createAppAsyncThunk<
  GetTrustmarkThunkOutput,
  GetTrustmarkThunkInput
>("trustmark/trustmarkGet", async (args, { getState }) => {
  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation = selectAttestationAsJwt(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Generate a trustmark for the credential
  const { jwt, expirationTime } =
    await Credential.Trustmark.getCredentialTrustmark({
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType: args.credentialType,
      docNumber: args.documentNumber,
    });

  return {
    trustmarkJwt: jwt,
    credentialType: args.credentialType,
    expirationTime,
  };
});
