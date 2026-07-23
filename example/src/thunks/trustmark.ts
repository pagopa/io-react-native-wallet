import {
  createCryptoContextFor,
  IoWallet,
} from "@pagopa/io-react-native-wallet";

import type { SupportedCredentialsWithoutPid } from "../store/types";

import { selectWalletInstanceAttestationAsJwt } from "../store/reducers/attestation";
import { selectItwVersion } from "../store/reducers/environment";
import { WIA_KEYTAG } from "../utils/crypto";
import { createAppAsyncThunk } from "./utils";

export interface GetTrustmarkThunkOutput {
  credentialType: SupportedCredentialsWithoutPid;
  expirationTime: number;
  trustmarkJwt: string;
}

/**
 * Type definition for the input of the {@link getTrustmarkThunk}.
 */
interface GetTrustmarkThunkInput {
  credentialType: SupportedCredentialsWithoutPid;
  documentNumber?: string;
}

/**
 * Thunk to obtain a new trustmark for a credential.
 */
export const getTrustmarkThunk = createAppAsyncThunk<
  GetTrustmarkThunkOutput,
  GetTrustmarkThunkInput
>("trustmark/trustmarkGet", async (args, { getState }) => {
  // Gets the Wallet Instance Attestation from the persisted store
  const walletInstanceAttestation =
    selectWalletInstanceAttestationAsJwt(getState());
  if (!walletInstanceAttestation) {
    throw new Error("Wallet Instance Attestation not found");
  }

  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  const wiaCryptoContext = createCryptoContextFor(WIA_KEYTAG);

  // Generate a trustmark for the credential
  const { expirationTime, jwt } = await wallet.Trustmark.getCredentialTrustmark(
    {
      credentialType: args.credentialType,
      docNumber: args.documentNumber,
      walletInstanceAttestation,
      wiaCryptoContext,
    },
  );

  return {
    credentialType: args.credentialType,
    expirationTime,
    trustmarkJwt: jwt,
  };
});
