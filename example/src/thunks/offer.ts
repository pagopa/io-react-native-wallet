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

  const { credential_offer, credential_offer_uri } =
    wallet.CredentialsOffer.startFlow(args.qrcode);

  console.log("credential_offer_uri", credential_offer_uri);
  console.log("credential_offer", credential_offer);

  if (credential_offer_uri) {
    return await wallet.CredentialsOffer.fetchCredentialOffer(
      credential_offer_uri,
      { appFetch }
    );
  }

  if (credential_offer) {
    return credential_offer;
  }

  throw new Error("Invalid credential offer");
});
