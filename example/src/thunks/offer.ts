import { CredentialOffer, IoWallet } from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { selectItwVersion } from "../store/reducers/environment";

export type GetCredentialOfferThunkInput = {
  qrcode: string;
};

export type GetCredentialOfferThunkOutput =
  CredentialOffer.ExtractGrantDetailsResult;

export const getCredentialOfferThunk = createAppAsyncThunk<
  GetCredentialOfferThunkOutput,
  GetCredentialOfferThunkInput
>("credential/offerGet", async (args, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // 1) Resolve and validate the credential offer
  const credentialOffer = await wallet.CredentialsOffer.resolveCredentialOffer(
    args.qrcode,
    { fetch: appFetch }
  );

  // 2) Extract grant details
  return wallet.CredentialsOffer.extractGrantDetails(credentialOffer);
});
