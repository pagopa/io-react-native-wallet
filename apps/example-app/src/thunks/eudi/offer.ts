import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { createAppAsyncThunk } from "../utils";

export interface ResolveEudiCredentialOfferThunkInput {
  uri: string;
}

export interface ResolveEudiCredentialOfferThunkOutput {
  /** The Credential Issuer Metadata, to show what is offered before the issuance */
  issuerMetadata: Eudi.CredentialIssuance.CredentialIssuerMetadata;
  offer: Eudi.CredentialOffer.CredentialOffer;
  uri: string;
}

/**
 * Thunk to resolve an EUDI Wallet Credential Offer, separate from the IT-Wallet one,
 * together with the metadata of its Credential Issuer.
 * The plain fetch is used since the requests are not directed to the IO backend.
 */
export const resolveEudiCredentialOfferThunk = createAppAsyncThunk<
  ResolveEudiCredentialOfferThunkOutput,
  ResolveEudiCredentialOfferThunkInput
>("eudi/offerResolve", async ({ uri }) => {
  const offer = await Eudi.CredentialOffer.resolveCredentialOffer(uri);
  const { authorizationCodeGrant, preAuthorizedCodeGrant } =
    Eudi.CredentialOffer.extractGrantDetails(offer);
  const { issuerMetadata } = await Eudi.CredentialIssuance.fetchMetadata(
    offer.credential_issuer,
    {
      authorizationServer:
        authorizationCodeGrant?.authorizationServer ??
        preAuthorizedCodeGrant?.authorizationServer,
    },
  );
  return { issuerMetadata, offer, uri };
});
