import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { selectEudiLotes } from "../../store/reducers/eudi/trust";
import { createAppAsyncThunk } from "../utils";

export interface ResolveEudiCredentialOfferThunkInput {
  uri: string;
}

export interface ResolveEudiCredentialOfferThunkOutput {
  /** The outcome of the Issuer authentication with its WRPAC */
  issuerAuthentication: {
    error?: { message: string; name: string };
    isWRPACValid: boolean;
  };
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
>("eudi/offerResolve", async ({ uri }, { getState }) => {
  const { EUWRPACProvidersList } = selectEudiLotes(getState());

  if (!EUWRPACProvidersList) {
    throw new Error(
      "A WRPAC providers LoTE is necessary to authenticate the Issuer",
    );
  }

  const offer = await Eudi.CredentialOffer.resolveCredentialOffer(uri);

  const { authorizationCodeGrant, preAuthorizedCodeGrant } =
    Eudi.CredentialOffer.extractGrantDetails(offer);

  const { issuerMetadata, issuerMetadataJwt } =
    await Eudi.CredentialIssuance.fetchMetadata(offer.credential_issuer, {
      authorizationServer:
        authorizationCodeGrant?.authorizationServer ??
        preAuthorizedCodeGrant?.authorizationServer,
    });

  const issuerAuthentication =
    await Eudi.CredentialIssuance.verifyIssuerAuthentication({
      jwt: issuerMetadataJwt,
      wrpacLote: EUWRPACProvidersList,
    });

  return { issuerAuthentication, issuerMetadata, offer, uri };
});
