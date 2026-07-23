import { CredentialOffer, IoWallet } from "@pagopa/io-react-native-wallet";

import type { SupportedCredentialsWithoutPid } from "../store/types";

import { selectItwVersion } from "../store/reducers/environment";
import appFetch from "../utils/fetch";
import { getCredentialThunk } from "./credential";
import { createAppAsyncThunk } from "./utils";

export interface GetCredentialOfferThunkInput {
  qrcode: string;
}

export type GetCredentialOfferThunkOutput = CredentialOffer.CredentialOffer;

export const getCredentialOfferThunk = createAppAsyncThunk<
  GetCredentialOfferThunkOutput,
  GetCredentialOfferThunkInput
>("credential/offerGet", async (args, { dispatch, getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // Resolve the credential offer (by value or by reference)
  const credentialOffer = await wallet.CredentialsOffer.resolveCredentialOffer(
    args.qrcode,
    { fetch: appFetch },
  );

  // For simplicity, the sample app drives the issuance with the first offered
  // credential configuration id, assuming it maps to a supported credential type.
  const [credentialConfigurationId] =
    credentialOffer.credential_configuration_ids;
  if (!credentialConfigurationId) {
    throw new Error(
      "The credential offer does not contain any credential configuration id",
    );
  }

  // Hand over to the credential issuance flow, which evaluates the issuer trust
  // and validates the credential offer before obtaining the credential.
  await dispatch(
    getCredentialThunk({
      credentialOffer,
      credentialType:
        credentialConfigurationId as SupportedCredentialsWithoutPid,
    }),
  ).unwrap();

  return credentialOffer;
});
