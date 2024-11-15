import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import { selectAttestation } from "../store/reducers/attestation";
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
};

/**
 * Thunk to obtain a new trustmark for a credential.
 */
export const getTrustmarkThunk = createAppAsyncThunk<
  GetTrustmarkThunkOutput,
  GetTrustmarkThunkInput
>("trustmark/trustmarkGet", async (args, { getState }) => {
  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation = selectAttestation(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Generate a trustmark for the credential
  const trustmarkJwt = await Credential.Trustmark.getCredentialTrustmarkJwt(
    walletInstanceAttestation,
    wiaCryptoContext,
    args.credentialType,
    args.documentNumber
  );

  return {
    trustmarkJwt,
  };
});
