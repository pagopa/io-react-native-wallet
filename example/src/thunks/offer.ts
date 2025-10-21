import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { Credential } from "@pagopa/io-react-native-wallet";

export type GetCredentialOfferThunkInput = {
  qrcode: string;
};

export type GetCredentialOfferThunkOutput = Credential.Offer.CredentialOffer;

export const geCredentialOfferThunk = createAppAsyncThunk<
  GetCredentialOfferThunkOutput,
  GetCredentialOfferThunkInput
>("credential/offerGet", async (args) => {
  const { credential_offer, credential_offer_uri } =
    Credential.Offer.startFlowFromQR(args.qrcode);

  console.log("credential_offer_uri", credential_offer_uri);
  console.log("credential_offer", credential_offer);

  if (credential_offer_uri) {
    const offer = await Credential.Offer.fetchCredentialOffer(
      credential_offer_uri,
      { appFetch }
    );
    return offer;
  }

  if (credential_offer) {
    return credential_offer;
  }

  throw new Error("Invalid credential offer");
});
