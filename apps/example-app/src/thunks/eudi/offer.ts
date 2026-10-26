import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { selectEudiLotes } from "../../store/reducers/eudi/trust";
import { createAppAsyncThunk } from "../utils";

export interface ResolveEudiCredentialOfferThunkInput {
  uri: string;
}

export interface ResolveEudiCredentialOfferThunkOutput {
  /** The Credential Issuer Metadata, to show what is offered before the issuance */
  issuerMetadata: Eudi.CredentialIssuance.CredentialIssuerMetadata;
  /** The outcome of the Issuer trust evaluation with its WRPAC and WRPRC */
  issuerTrust: {
    error?: { message: string; name: string };
    isTrusted: boolean;
  };
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
  const lotes = selectEudiLotes(getState());

  if (!lotes.EUWRPACProvidersList || !lotes.EUWRPRCProvidersList) {
    throw new Error("Missing WRPAC and WRPRC providers lists");
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

  const issuerTrust = await Eudi.CredentialIssuance.evaluateIssuerTrust({
    issuerMetadataJwt,
    wrpacLote: lotes.EUWRPACProvidersList,
    wrprcLote: lotes.EUWRPRCProvidersList,
  });

  return { issuerMetadata, issuerTrust, offer, uri };
});
