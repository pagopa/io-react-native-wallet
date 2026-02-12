import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { IoWallet } from "@pagopa/io-react-native-wallet";
import { selectItwVersion } from "../store/reducers/environment";

export type GetCredentialOfferThunkInput = {
  qrcode: string;
};

// Todo: replace `any` with the actual type of the credential offer
export type GetCredentialOfferThunkOutput = any;

export const getCredentialOfferThunk = createAppAsyncThunk<
  GetCredentialOfferThunkOutput,
  GetCredentialOfferThunkInput
>("credential/offerGet", async (args, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  const credentialOffer = await wallet.CredentialsOffer.resolveCredentialOffer(
    args.qrcode,
    { fetch: appFetch }
  );

  return credentialOffer;
});
