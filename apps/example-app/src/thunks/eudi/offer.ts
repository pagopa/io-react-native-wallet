import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";

import { createAppAsyncThunk } from "../utils";

export interface ResolveEudiCredentialOfferThunkInput {
  uri: string;
}

/**
 * Thunk to resolve an EUDI Wallet Credential Offer, separate from the IT-Wallet one.
 * The plain fetch is used since the requests are not directed to the IO backend.
 */
export const resolveEudiCredentialOfferThunk = createAppAsyncThunk<
  Eudi.CredentialOffer.CredentialOffer,
  ResolveEudiCredentialOfferThunkInput
>("eudi/offerResolve", (args) =>
  Eudi.CredentialOffer.resolveCredentialOffer(args.uri),
);
